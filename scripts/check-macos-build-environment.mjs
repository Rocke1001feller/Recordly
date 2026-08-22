#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const label = "[macos-build-env]";

function log(message) {
	console.log(`${label} ${message}`);
}

function warn(message) {
	console.warn(`${label} ${message}`);
}

function fail(message) {
	console.error(`${label} ${message}`);
}

function run(command, args, options = {}) {
	const result = spawnSync(command, args, {
		encoding: "utf8",
		stdio: "pipe",
		...options,
	});
	return {
		stdout: result.stdout?.trim() ?? "",
		stderr: result.stderr?.trim() ?? "",
		status: result.status,
		error: result.error,
	};
}

function getExpectedLibintlPath() {
	// electron-builder's bundled dmgbuild Python is linked against Homebrew's
	// gettext. The Homebrew prefix depends on the host architecture.
	const isArm64 = process.arch === "arm64";
	const brewPrefix = isArm64 ? "/opt/homebrew" : "/usr/local";
	return path.join(brewPrefix, "opt/gettext/lib/libintl.8.dylib");
}

function findBrewPrefix() {
	const result = run("brew", ["--prefix"]);
	if (result.status !== 0 || result.error) {
		return null;
	}
	return result.stdout.trim();
}

function tryInstallGettext() {
	log("gettext appears to be missing; attempting to install via Homebrew...");
	const installResult = run("brew", ["install", "gettext"], {
		timeout: 5 * 60 * 1000,
	});
	if (installResult.status !== 0) {
		fail(`brew install gettext failed:\n${installResult.stderr || installResult.stdout}`);
		return false;
	}
	log("gettext installed successfully");
	return true;
}

export function checkMacOSBuildEnvironment() {
	if (process.platform !== "darwin") {
		log("Skipping: not running on macOS");
		return;
	}

	if (process.env.SKIP_MACOS_BUILD_ENV_CHECK) {
		log("Skipping check: SKIP_MACOS_BUILD_ENV_CHECK is set");
		return;
	}

	if (process.env.CUSTOM_DMGBUILD_PATH) {
		log("Skipping bundled dmgbuild dependency check: CUSTOM_DMGBUILD_PATH is set");
		return;
	}

	const libintlPath = getExpectedLibintlPath();
	if (existsSync(libintlPath)) {
		log(`Found gettext dependency: ${libintlPath}`);
		return;
	}

	warn(`Missing gettext dependency: ${libintlPath}`);

	const brewPrefix = findBrewPrefix();
	if (!brewPrefix) {
		throw new Error(
			"Homebrew is required to install gettext for DMG builds, but 'brew' was not found.\n" +
				"Please install Homebrew (https://brew.sh) and then run: brew install gettext",
		);
	}

	// The expected path might use a different prefix (e.g., user has a custom
	// Homebrew installation). Re-check against the active brew prefix before
	// attempting installation.
	const actualLibintlPath = path.join(brewPrefix, "opt/gettext/lib/libintl.8.dylib");
	if (actualLibintlPath !== libintlPath && existsSync(actualLibintlPath)) {
		log(`Found gettext dependency at active Homebrew prefix: ${actualLibintlPath}`);
		return;
	}

	if (!tryInstallGettext()) {
		throw new Error(
			"Failed to install gettext via Homebrew.\n" +
				"Please install it manually: brew install gettext",
		);
	}

	if (!existsSync(libintlPath) && !existsSync(actualLibintlPath)) {
		throw new Error(
			`gettext was installed but the expected library is still missing: ${libintlPath}\n` +
				"You may need to run: brew link gettext",
		);
	}

	log("gettext dependency resolved");
}

const invokedPath = process.argv[1] ? path.resolve(process.argv[1]) : null;
if (invokedPath === fileURLToPath(import.meta.url)) {
	try {
		checkMacOSBuildEnvironment();
	} catch (error) {
		fail(error instanceof Error ? error.message : String(error));
		process.exitCode = 1;
	}
}
