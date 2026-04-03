import { basename, dirname, extname, join, relative, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { parse } from "smol-toml";
import { access, readFile, readdir } from "node:fs/promises";
import { constants, existsSync } from "node:fs";
//#region ../src/engine.ts
function byPriority(left, right) {
	return left.priority - right.priority || left.id.localeCompare(right.id);
}
function unique(items) {
	return [...new Set(items)];
}
function parseGitStatusPath(line) {
	if (line.length < 4) return;
	const rawPath = line.slice(3).trim();
	if (rawPath.length === 0) return;
	const renameParts = rawPath.split(" -> ");
	return renameParts[renameParts.length - 1]?.trim() || void 0;
}
function buildTaskIndex(tasks) {
	return new Map(tasks.map((task) => [task.id, task]));
}
function summarizeTaskNode(task, index) {
	return {
		task,
		unmetDependencies: task.dependsOn.filter((dependencyId) => index.get(dependencyId)?.status !== "done"),
		downstreamCount: [...index.values()].filter((candidate) => candidate.dependsOn.includes(task.id)).length
	};
}
function deriveMissingDependencies(tasks) {
	const index = buildTaskIndex(tasks);
	return tasks.flatMap((task) => task.dependsOn.filter((dependencyId) => !index.has(dependencyId)).map((missingTaskId) => ({
		taskId: task.id,
		missingTaskId
	})));
}
function deriveChangedItems(context) {
	const specByPath = new Map(context.specs.map((spec) => [relative(context.rootDir, spec.filePath), spec]));
	const taskByPath = new Map(context.tasks.map((task) => [relative(context.rootDir, task.filePath), task]));
	const handoffByPath = new Map(context.handoffs.map((handoff) => [relative(context.rootDir, handoff.filePath), handoff]));
	const currentStatePath = relative(context.rootDir, context.currentState.filePath);
	const seen = /* @__PURE__ */ new Set();
	const items = [];
	for (const line of context.git.shortStatus) {
		const path = parseGitStatusPath(line);
		if (!path || seen.has(path)) continue;
		seen.add(path);
		const spec = specByPath.get(path);
		if (spec) {
			items.push({
				kind: "spec",
				path,
				id: spec.id,
				title: spec.title
			});
			continue;
		}
		const task = taskByPath.get(path);
		if (task) {
			items.push({
				kind: "task",
				path,
				id: task.id,
				title: task.title
			});
			continue;
		}
		if (path === currentStatePath) {
			items.push({
				kind: "current-state",
				path,
				id: context.currentState.id,
				title: context.currentState.title
			});
			continue;
		}
		const handoff = handoffByPath.get(path);
		if (handoff) {
			items.push({
				kind: "handoff",
				path,
				id: handoff.id,
				title: handoff.title
			});
			continue;
		}
		items.push({
			kind: "other",
			path
		});
	}
	return items;
}
function deriveActiveTaskIds(tasks, currentState) {
	if (currentState.activeTaskIds.length > 0) return unique(currentState.activeTaskIds);
	return tasks.filter((task) => task.status === "in_progress" || task.status === "review").map((task) => task.id);
}
function deriveActiveSpecIds(specs, currentState, activeTaskIds, taskIndex) {
	if (currentState.activeSpecIds.length > 0) return unique(currentState.activeSpecIds);
	const inferred = activeTaskIds.flatMap((taskId) => taskIndex.get(taskId)?.specIds ?? []);
	return unique(specs.filter((spec) => spec.status === "active").map((spec) => spec.id).concat(inferred));
}
function computeCriticalPath(tasks, index) {
	const unfinished = tasks.filter((task) => task.status !== "done" && task.status !== "cancelled");
	const cache = /* @__PURE__ */ new Map();
	function dfs(task, trail) {
		if (cache.has(task.id)) return cache.get(task.id);
		if (trail.has(task.id)) return [task];
		const nextTrail = new Set(trail);
		nextTrail.add(task.id);
		let best = [task];
		for (const dependencyId of task.dependsOn) {
			const dependency = index.get(dependencyId);
			if (!dependency || dependency.status === "done" || dependency.status === "cancelled") continue;
			const candidate = [...dfs(dependency, nextTrail), task];
			if (candidate.length > best.length) best = candidate;
		}
		cache.set(task.id, best);
		return best;
	}
	let overallBest = [];
	for (const task of unfinished) {
		const candidate = dfs(task, /* @__PURE__ */ new Set());
		if (candidate.length > overallBest.length) overallBest = candidate;
	}
	return overallBest;
}
function deriveStatusSnapshot(context) {
	const taskIndex = buildTaskIndex(context.tasks);
	const activeTaskIds = deriveActiveTaskIds(context.tasks, context.currentState);
	const activeSpecIds = deriveActiveSpecIds(context.specs, context.currentState, activeTaskIds, taskIndex);
	const activeTasks = activeTaskIds.map((taskId) => taskIndex.get(taskId)).filter((task) => Boolean(task));
	const activeTaskSet = new Set(activeTasks.map((task) => task.id));
	const blockedTasks = context.tasks.filter((task) => task.status === "blocked" || task.status === "todo" && task.dependsOn.some((dependencyId) => taskIndex.get(dependencyId)?.status !== "done")).map((task) => summarizeTaskNode(task, taskIndex)).sort((left, right) => byPriority(left.task, right.task));
	const reviewTasks = context.tasks.filter((task) => task.status === "review").map((task) => summarizeTaskNode(task, taskIndex)).sort((left, right) => byPriority(left.task, right.task));
	const readyTasks = context.tasks.filter((task) => {
		if (task.status !== "todo") return false;
		return summarizeTaskNode(task, taskIndex).unmetDependencies.length === 0;
	}).filter((task) => !activeTaskSet.has(task.id)).map((task) => summarizeTaskNode(task, taskIndex)).sort((left, right) => byPriority(left.task, right.task));
	return {
		specCount: context.specs.length,
		taskCount: context.tasks.length,
		activeSpecIds,
		activeTaskIds,
		blockedTasks,
		reviewTasks,
		readyTasks,
		inProgressTasks: context.tasks.filter((task) => task.status === "in_progress").sort(byPriority),
		recentHandoff: context.handoffs[0],
		criticalPath: computeCriticalPath(context.tasks, taskIndex),
		missingDependencies: deriveMissingDependencies(context.tasks),
		changedItems: deriveChangedItems(context)
	};
}
function deriveNextActions(context, snapshot) {
	const actions = [];
	if (snapshot.blockedTasks.length > 0) for (const blocked of snapshot.blockedTasks.slice(0, 2)) {
		const reason = blocked.unmetDependencies.length > 0 ? `waiting on ${blocked.unmetDependencies.join(", ")}` : "marked blocked";
		actions.push(`Unblock ${blocked.task.id} (${blocked.task.title}) because it is ${reason}.`);
	}
	if (snapshot.inProgressTasks.length > 0) for (const task of snapshot.inProgressTasks.slice(0, 2)) actions.push(`Continue ${task.id} (${task.title}) and update the configured current state file when its scope shifts.`);
	if (actions.length < 3 && snapshot.reviewTasks.length > 0) for (const review of snapshot.reviewTasks.slice(0, 3 - actions.length)) actions.push(`Review ${review.task.id} (${review.task.title}) before moving it to done.`);
	if (actions.length < 3 && snapshot.readyTasks.length > 0) for (const ready of snapshot.readyTasks.slice(0, 3 - actions.length)) actions.push(`Start ${ready.task.id} (${ready.task.title}); all declared dependencies are satisfied.`);
	if (actions.length < 4 && snapshot.changedItems.length > 0) {
		const changedDocs = snapshot.changedItems.filter((item) => item.kind !== "other").slice(0, 2).map((item) => item.id ?? item.path);
		if (changedDocs.length > 0) actions.push(`Reconcile recent repo changes touching ${changedDocs.join(", ")} before the next checkpoint.`);
	}
	if (actions.length === 0) actions.push("Capture the next meaningful slice in the configured current state file or create a new task.");
	for (const hint of context.currentState.nextActionHints) {
		if (actions.length >= 4) break;
		actions.push(hint);
	}
	return unique(actions);
}
//#endregion
//#region ../src/domain.ts
var SPEC_STATUSES = [
	"proposed",
	"active",
	"paused",
	"done",
	"archived"
];
var TASK_STATUSES = [
	"todo",
	"in_progress",
	"blocked",
	"review",
	"done",
	"cancelled"
];
var HANDOFF_KINDS = [
	"checkpoint",
	"resume",
	"decision",
	"release"
];
var BACKEND_NAMES = [
	"deterministic",
	"prompt",
	"codex",
	"claude"
];
function fail(message) {
	throw new Error(message);
}
function isRecord(value) {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}
function asString(value, field, filePath, fallback) {
	if (typeof value === "string" && value.trim().length > 0) return value.trim();
	if (fallback !== void 0) return fallback;
	fail(`Expected "${field}" to be a non-empty string in ${filePath}`);
}
function asOptionalString(value) {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : void 0;
}
function asStringArray(value, field, filePath) {
	if (value === void 0) return [];
	if (Array.isArray(value) && value.every((item) => typeof item === "string")) return value.map((item) => item.trim()).filter(Boolean);
	fail(`Expected "${field}" to be an array of strings in ${filePath}`);
}
function asNumber(value, field, filePath, fallback) {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	return fallback;
}
function asEnum(value, allowed, field, filePath, fallback) {
	if (typeof value === "string" && allowed.includes(value)) return value;
	if (fallback !== void 0) return fallback;
	fail(`Expected "${field}" in ${filePath} to be one of: ${allowed.join(", ")}`);
}
function parseProjectConfig(data) {
	if (!isRecord(data)) fail("Project config must be a TOML object.");
	const defaults = isRecord(data.defaults) ? data.defaults : {};
	const backends = isRecord(data.backends) ? data.backends : {};
	const deterministicBackend = isRecord(backends.deterministic) ? backends.deterministic : {};
	const promptBackend = isRecord(backends.prompt) ? backends.prompt : {};
	const codexBackend = isRecord(backends.codex) ? backends.codex : {};
	const claudeBackend = isRecord(backends.claude) ? backends.claude : {};
	return {
		toolVersion: asString(data.tool_version, "tool_version", ".specpm/config.toml"),
		projectName: asString(data.project_name, "project_name", ".specpm/config.toml"),
		memoryDir: asString(data.memory_dir, "memory_dir", ".specpm/config.toml", "docs/spm"),
		stateFile: asString(data.state_file, "state_file", ".specpm/config.toml", "docs/spm/current.md"),
		handoffsDir: asString(data.handoffs_dir, "handoffs_dir", ".specpm/config.toml", "docs/spm/handoffs"),
		specsDir: asString(data.specs_dir, "specs_dir", ".specpm/config.toml", "docs/spm/specs"),
		tasksDir: asString(data.tasks_dir, "tasks_dir", ".specpm/config.toml", "docs/spm/tasks"),
		skillsDir: asString(data.skills_dir, "skills_dir", ".specpm/config.toml", "docs/spm/skills"),
		defaults: { resumeBackend: asEnum(defaults.resume_backend, BACKEND_NAMES, "defaults.resume_backend", ".specpm/config.toml", "deterministic") },
		backends: {
			deterministic: { enabled: deterministicBackend.enabled !== false },
			prompt: { enabled: promptBackend.enabled !== false },
			codex: {
				enabled: codexBackend.enabled === true,
				command: asOptionalString(codexBackend.command),
				args: asStringArray(codexBackend.args, "backends.codex.args", ".specpm/config.toml")
			},
			claude: {
				enabled: claudeBackend.enabled === true,
				command: asOptionalString(claudeBackend.command),
				args: asStringArray(claudeBackend.args, "backends.claude.args", ".specpm/config.toml")
			}
		}
	};
}
function parseSpecDocument(filePath, attributes, body) {
	if (!isRecord(attributes)) fail(`Invalid frontmatter in ${filePath}`);
	return {
		docKind: asEnum(attributes.doc_kind, ["spec"], "doc_kind", filePath),
		id: asString(attributes.id, "id", filePath),
		title: asString(attributes.title, "title", filePath),
		summary: asString(attributes.summary, "summary", filePath, "No summary provided."),
		status: asEnum(attributes.status, SPEC_STATUSES, "status", filePath, "proposed"),
		taskIds: asStringArray(attributes.task_ids, "task_ids", filePath),
		tags: asStringArray(attributes.tags, "tags", filePath),
		owner: asOptionalString(attributes.owner),
		updatedAt: asOptionalString(attributes.updated_at),
		body: body.trim(),
		filePath
	};
}
function parseTaskDocument(filePath, attributes, body) {
	if (!isRecord(attributes)) fail(`Invalid frontmatter in ${filePath}`);
	return {
		docKind: asEnum(attributes.doc_kind, ["task"], "doc_kind", filePath),
		id: asString(attributes.id, "id", filePath),
		title: asString(attributes.title, "title", filePath),
		summary: asString(attributes.summary, "summary", filePath, "No summary provided."),
		status: asEnum(attributes.status, TASK_STATUSES, "status", filePath, "todo"),
		specIds: asStringArray(attributes.spec_ids, "spec_ids", filePath),
		dependsOn: asStringArray(attributes.depends_on, "depends_on", filePath),
		blockedBy: asStringArray(attributes.blocked_by, "blocked_by", filePath),
		priority: asNumber(attributes.priority, "priority", filePath, 3),
		ownerRole: asOptionalString(attributes.owner_role),
		tags: asStringArray(attributes.tags, "tags", filePath),
		updatedAt: asOptionalString(attributes.updated_at),
		body: body.trim(),
		filePath
	};
}
function parseHandoffDocument(filePath, attributes, body) {
	if (!isRecord(attributes)) fail(`Invalid frontmatter in ${filePath}`);
	return {
		docKind: asEnum(attributes.doc_kind, ["handoff"], "doc_kind", filePath),
		id: asString(attributes.id, "id", filePath),
		title: asString(attributes.title, "title", filePath),
		summary: asString(attributes.summary, "summary", filePath, "No summary provided."),
		handoffKind: asEnum(attributes.handoff_kind, HANDOFF_KINDS, "handoff_kind", filePath, "checkpoint"),
		createdAt: asString(attributes.created_at, "created_at", filePath),
		activeTaskIds: asStringArray(attributes.active_task_ids, "active_task_ids", filePath),
		relatedSpecIds: asStringArray(attributes.related_spec_ids, "related_spec_ids", filePath),
		author: asString(attributes.author, "author", filePath, "spec-embryo"),
		tags: asStringArray(attributes.tags, "tags", filePath),
		updatedAt: asOptionalString(attributes.updated_at),
		body: body.trim(),
		filePath
	};
}
function parseCurrentStateDocument(filePath, attributes, body) {
	if (!isRecord(attributes)) fail(`Invalid frontmatter in ${filePath}`);
	return {
		docKind: asEnum(attributes.doc_kind, ["current-state"], "doc_kind", filePath),
		id: asString(attributes.id, "id", filePath, "CURRENT"),
		title: asString(attributes.title, "title", filePath, "Current Project State"),
		summary: asString(attributes.summary, "summary", filePath, "Current project state."),
		focus: asString(attributes.focus, "focus", filePath, "Define the current focus."),
		activeSpecIds: asStringArray(attributes.active_spec_ids, "active_spec_ids", filePath),
		activeTaskIds: asStringArray(attributes.active_task_ids, "active_task_ids", filePath),
		blockedTaskIds: asStringArray(attributes.blocked_task_ids, "blocked_task_ids", filePath),
		nextActionHints: asStringArray(attributes.next_action_hints, "next_action_hints", filePath),
		lastHandoffId: asOptionalString(attributes.last_handoff_id),
		tags: asStringArray(attributes.tags, "tags", filePath),
		updatedAt: asOptionalString(attributes.updated_at),
		body: body.trim(),
		filePath
	};
}
//#endregion
//#region ../src/frontmatter.ts
function parseTomlFrontmatter(input) {
	const normalized = input.replace(/\r\n/g, "\n");
	if (!normalized.startsWith("+++\n")) return {
		attributes: {},
		body: normalized.trim()
	};
	const match = normalized.match(/^\+\+\+\n([\s\S]*?)\n\+\+\+\n?([\s\S]*)$/);
	if (!match) throw new Error("Invalid TOML frontmatter. Expected opening and closing +++ fences.");
	const [, rawAttributes, body = ""] = match;
	return {
		attributes: parse(rawAttributes),
		body: body.trim()
	};
}
//#endregion
//#region ../src/paths.ts
function resolveProjectPaths(rootDir, config) {
	return {
		rootDir,
		specpmDir: join(rootDir, ".specpm"),
		configFile: join(rootDir, ".specpm", "config.toml"),
		tempDir: join(rootDir, ".specpm", "tmp"),
		memoryDir: config ? join(rootDir, config.memoryDir) : join(rootDir, "docs", "spm"),
		stateFile: config ? join(rootDir, config.stateFile) : join(rootDir, "docs", "spm", "current.md"),
		handoffsDir: config ? join(rootDir, config.handoffsDir) : join(rootDir, "docs", "spm", "handoffs"),
		specsDir: config ? join(rootDir, config.specsDir) : join(rootDir, "docs", "spm", "specs"),
		tasksDir: config ? join(rootDir, config.tasksDir) : join(rootDir, "docs", "spm", "tasks"),
		skillsDir: config ? join(rootDir, config.skillsDir) : join(rootDir, "docs", "spm", "skills"),
		templatesDir: join(rootDir, ".specpm", "templates")
	};
}
//#endregion
//#region ../src/storage.ts
async function pathExists(filePath) {
	try {
		await access(filePath, constants.F_OK);
		return true;
	} catch {
		return false;
	}
}
async function readUtf8(filePath) {
	return readFile(filePath, "utf8");
}
async function listMarkdownFiles(dirPath) {
	if (!await pathExists(dirPath)) return [];
	const entries = await readdir(dirPath, { withFileTypes: true });
	const results = [];
	for (const entry of entries) {
		const fullPath = join(dirPath, entry.name);
		if (entry.isDirectory()) {
			results.push(...await listMarkdownFiles(fullPath));
			continue;
		}
		if (entry.isFile() && extname(entry.name) === ".md" && entry.name !== "AGENTS.md") results.push(fullPath);
	}
	return results.sort();
}
//#endregion
//#region ../src/services/layout.ts
function buildManagedPaths(memoryDir) {
	return {
		memoryDir,
		stateFile: `${memoryDir}/current.md`,
		handoffsDir: `${memoryDir}/handoffs`,
		specsDir: `${memoryDir}/specs`,
		tasksDir: `${memoryDir}/tasks`,
		skillsDir: `${memoryDir}/skills`
	};
}
//#endregion
//#region ../src/templates.ts
function createConfigToml(projectName, memoryDir = "docs/spm") {
	const managed = buildManagedPaths(memoryDir);
	return `
tool_version = "0.1.0"
project_name = ${JSON.stringify(projectName)}
memory_dir = ${JSON.stringify(managed.memoryDir)}
state_file = ${JSON.stringify(managed.stateFile)}
handoffs_dir = ${JSON.stringify(managed.handoffsDir)}
specs_dir = ${JSON.stringify(managed.specsDir)}
tasks_dir = ${JSON.stringify(managed.tasksDir)}
skills_dir = ${JSON.stringify(managed.skillsDir)}

[defaults]
resume_backend = "deterministic"

[backends.deterministic]
enabled = true

[backends.prompt]
enabled = true

[backends.codex]
enabled = false
command = "codex"
args = ["exec", "{prompt_text_file}"]

[backends.claude]
enabled = false
command = "claude"
args = ["-p", "{prompt}"]
`.trimStart();
}
function inferProjectName(rootDir) {
	return basename(rootDir);
}
//#endregion
//#region ../src/repository.ts
function git(rootDir, args) {
	const result = spawnSync("git", args, {
		cwd: rootDir,
		encoding: "utf8"
	});
	if (result.status !== 0) return "";
	return result.stdout.trim();
}
async function loadMarkdownDocument(filePath, parser) {
	const { attributes, body } = parseTomlFrontmatter(await readUtf8(filePath));
	return parser(filePath, attributes, body);
}
async function loadMarkdownCollection(dirPath, parser) {
	const files = await listMarkdownFiles(dirPath);
	return Promise.all(files.map((filePath) => loadMarkdownDocument(filePath, parser)));
}
function createDefaultConfig(rootDir) {
	return parseProjectConfig(parse(createConfigToml(inferProjectName(rootDir))));
}
async function readProjectConfig(rootDir) {
	const defaultPaths = resolveProjectPaths(rootDir);
	if (!await pathExists(defaultPaths.configFile)) return createDefaultConfig(rootDir);
	return parseProjectConfig(parse(await readUtf8(defaultPaths.configFile)));
}
async function readCurrentState(paths) {
	if (!await pathExists(paths.stateFile)) return parseCurrentStateDocument(paths.stateFile, {
		doc_kind: "current-state",
		id: "CURRENT",
		title: "Current Project State",
		summary: "No current state file exists yet.",
		focus: "Run `spm init` or create the configured current state file.",
		active_spec_ids: [],
		active_task_ids: [],
		blocked_task_ids: [],
		next_action_hints: ["Initialize the project memory files."],
		tags: []
	}, "# Current State\n\nNo current state file exists yet.\n");
	return loadMarkdownDocument(paths.stateFile, parseCurrentStateDocument);
}
async function readGitSnapshot(rootDir) {
	if (git(rootDir, ["rev-parse", "--is-inside-work-tree"]) !== "true") return {
		available: false,
		shortStatus: [],
		dirty: false
	};
	const statusOutput = git(rootDir, ["status", "--short"]);
	const shortStatus = statusOutput ? statusOutput.split("\n").filter(Boolean) : [];
	return {
		available: true,
		branch: git(rootDir, ["branch", "--show-current"]) || void 0,
		shortStatus,
		lastCommit: git(rootDir, [
			"log",
			"-1",
			"--pretty=format:%h %s"
		]) || void 0,
		dirty: shortStatus.length > 0
	};
}
async function loadProjectContext(rootDir) {
	const config = await readProjectConfig(rootDir);
	const paths = resolveProjectPaths(rootDir, config);
	const [currentState, specs, tasks, handoffs, gitSnapshot] = await Promise.all([
		readCurrentState(paths),
		loadMarkdownCollection(paths.specsDir, parseSpecDocument),
		loadMarkdownCollection(paths.tasksDir, parseTaskDocument),
		loadMarkdownCollection(paths.handoffsDir, parseHandoffDocument),
		readGitSnapshot(rootDir)
	]);
	handoffs.sort((left, right) => right.createdAt.localeCompare(left.createdAt));
	return {
		rootDir,
		config,
		currentState,
		specs,
		tasks,
		handoffs,
		git: gitSnapshot
	};
}
//#endregion
//#region ../src/services/agents.ts
var EXCLUDED_DIRS = new Set([
	".git",
	"node_modules",
	"dist",
	"coverage"
]);
var CHAIN_TARGET = 1800;
var CHAIN_HARD_CAP = 2200;
var RULES = {
	".": {
		target: 900,
		hardCap: 1200
	},
	".specpm": {
		target: 300,
		hardCap: 400
	},
	"docs": {
		target: 300,
		hardCap: 500
	},
	"docs/spm": {
		target: 280,
		hardCap: 450
	},
	"docs/spm/specs": {
		target: 220,
		hardCap: 450
	},
	"docs/spm/tasks": {
		target: 220,
		hardCap: 450
	},
	"docs/spm/skills": {
		target: 220,
		hardCap: 450
	},
	"scripts": {
		target: 220,
		hardCap: 350
	},
	"skills": {
		target: 300,
		hardCap: 500
	},
	"src": {
		target: 350,
		hardCap: 600
	},
	"src/backends": {
		target: 240,
		hardCap: 450
	},
	"src/commands": {
		target: 220,
		hardCap: 450
	},
	"src/services": {
		target: 220,
		hardCap: 450
	},
	"tests": {
		target: 180,
		hardCap: 350
	}
};
function estimateTokens(content) {
	return Math.ceil(content.length / 4);
}
function agentsRuleForFolder(folder) {
	const normalized = folder === "" ? "." : folder;
	return RULES[Object.keys(RULES).filter((prefix) => normalized === prefix || normalized.startsWith(`${prefix}/`)).sort((left, right) => right.length - left.length)[0] ?? "."];
}
async function findAgentsFiles(rootDir, currentDir = rootDir) {
	const entries = await readdir(currentDir, { withFileTypes: true });
	const results = [];
	for (const entry of entries) {
		if (entry.isDirectory()) {
			if (EXCLUDED_DIRS.has(entry.name)) continue;
			results.push(...await findAgentsFiles(rootDir, join(currentDir, entry.name)));
			continue;
		}
		if (entry.isFile() && entry.name === "AGENTS.md") results.push(join(currentDir, entry.name));
	}
	return results.sort();
}
async function buildAgentsHealthReport(rootDir) {
	const files = await findAgentsFiles(rootDir);
	const tokenByFolder = /* @__PURE__ */ new Map();
	const fileReports = [];
	const failures = [];
	for (const file of files) {
		const relFile = relative(rootDir, file);
		const folder = dirname(relFile) === "." ? "." : dirname(relFile);
		const estimatedTokens = estimateTokens(await readFile(file, "utf8"));
		const rule = agentsRuleForFolder(folder);
		const ok = estimatedTokens <= rule.hardCap;
		tokenByFolder.set(folder, estimatedTokens);
		fileReports.push({
			absolutePath: file,
			relativePath: relFile,
			folder,
			estimatedTokens,
			rule,
			ok
		});
		if (!ok) failures.push(`${relFile} exceeds hard cap (${estimatedTokens} > ${rule.hardCap})`);
	}
	const chainReports = fileReports.map((file) => {
		const segments = file.folder === "." ? [] : file.folder.split("/");
		const chainFolders = ["."];
		for (let index = 0; index < segments.length; index += 1) chainFolders.push(segments.slice(0, index + 1).join("/"));
		const estimatedTokens = chainFolders.reduce((sum, entry) => sum + (tokenByFolder.get(entry) ?? 0), 0);
		const ok = estimatedTokens <= CHAIN_HARD_CAP;
		if (!ok) failures.push(`${file.relativePath} chain exceeds hard cap (${estimatedTokens} > ${CHAIN_HARD_CAP})`);
		return {
			relativePath: file.relativePath,
			chainFolders,
			estimatedTokens,
			target: CHAIN_TARGET,
			hardCap: CHAIN_HARD_CAP,
			ok
		};
	});
	return {
		files: fileReports,
		chains: chainReports,
		failures,
		summary: {
			fileCount: fileReports.length,
			failureCount: failures.length,
			maxFileTokens: fileReports.reduce((max, file) => Math.max(max, file.estimatedTokens), 0),
			maxChainTokens: chainReports.reduce((max, chain) => Math.max(max, chain.estimatedTokens), 0),
			ok: failures.length === 0
		}
	};
}
//#endregion
//#region ../src/services/dashboard.ts
function deriveEffectiveStatus(rawStatus, unmetDependencies) {
	if (rawStatus === "done" || rawStatus === "cancelled" || rawStatus === "in_progress" || rawStatus === "blocked" || rawStatus === "review") return rawStatus;
	return unmetDependencies.length > 0 ? "blocked" : "todo";
}
function deriveEffort(priority, downstreamCount) {
	return Math.min(8, (priority <= 1 ? 5 : priority === 2 ? 3 : 2) + Math.min(2, downstreamCount));
}
function toTaskCard(task, index) {
	const summary = summarizeTaskNode(task, index);
	const effectiveStatus = deriveEffectiveStatus(task.status, summary.unmetDependencies);
	const effort = deriveEffort(task.priority, summary.downstreamCount);
	return {
		id: task.id,
		title: task.title,
		summary: task.summary,
		rawStatus: task.status,
		effectiveStatus,
		priority: task.priority,
		specIds: task.specIds,
		dependsOn: task.dependsOn,
		unmetDependencies: summary.unmetDependencies,
		downstreamCount: summary.downstreamCount,
		effort
	};
}
function buildSpecProgress(taskCards) {
	const counts = {
		todo: 0,
		inProgress: 0,
		blocked: 0,
		review: 0,
		done: 0,
		cancelled: 0
	};
	for (const task of taskCards) {
		if (task.effectiveStatus === "in_progress") {
			counts.inProgress += 1;
			continue;
		}
		if (task.effectiveStatus === "blocked") {
			counts.blocked += 1;
			continue;
		}
		if (task.effectiveStatus === "review") {
			counts.review += 1;
			continue;
		}
		counts[task.effectiveStatus] += 1;
	}
	const total = taskCards.length;
	return {
		todo: counts.todo,
		inProgress: counts.inProgress,
		blocked: counts.blocked,
		review: counts.review,
		done: counts.done,
		cancelled: counts.cancelled,
		completionRatio: total === 0 ? 0 : counts.done / total
	};
}
function buildKanban(taskCards) {
	return [
		{
			id: "blocked",
			title: "Blocked"
		},
		{
			id: "todo",
			title: "Todo"
		},
		{
			id: "in_progress",
			title: "In Progress"
		},
		{
			id: "review",
			title: "Review"
		},
		{
			id: "done",
			title: "Done / Cancelled"
		}
	].map((column) => ({
		id: column.id,
		title: column.title,
		tasks: taskCards.filter((task) => {
			if (column.id === "done") return task.effectiveStatus === "done" || task.effectiveStatus === "cancelled";
			return task.effectiveStatus === column.id;
		}).sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id))
	}));
}
function buildTimeline(taskCards) {
	const taskMap = new Map(taskCards.map((task) => [task.id, task]));
	const cache = /* @__PURE__ */ new Map();
	function place(task, trail) {
		if (cache.has(task.id)) return cache.get(task.id);
		if (trail.has(task.id)) {
			const cyclePlacement = {
				start: 0,
				end: task.effort
			};
			cache.set(task.id, cyclePlacement);
			return cyclePlacement;
		}
		const nextTrail = new Set(trail);
		nextTrail.add(task.id);
		let start = 0;
		for (const dependencyId of task.dependsOn) {
			const dependency = taskMap.get(dependencyId);
			if (!dependency) continue;
			const placement = place(dependency, nextTrail);
			start = Math.max(start, placement.end);
		}
		const result = {
			start,
			end: start + task.effort
		};
		cache.set(task.id, result);
		return result;
	}
	const items = taskCards.filter((task) => task.effectiveStatus !== "cancelled").map((task) => {
		const placement = place(task, /* @__PURE__ */ new Set());
		return {
			taskId: task.id,
			title: task.title,
			effectiveStatus: task.effectiveStatus,
			specIds: task.specIds,
			effort: task.effort,
			start: placement.start,
			end: placement.end,
			priority: task.priority
		};
	}).sort((left, right) => left.start - right.start || left.priority - right.priority || left.taskId.localeCompare(right.taskId));
	return {
		totalUnits: items.reduce((max, item) => Math.max(max, item.end), 1),
		items
	};
}
async function buildDashboardData(rootDir) {
	const [context, agentsReport] = await Promise.all([loadProjectContext(rootDir), buildAgentsHealthReport(rootDir)]);
	const snapshot = deriveStatusSnapshot(context);
	const nextActions = deriveNextActions(context, snapshot);
	const taskIndex = buildTaskIndex(context.tasks);
	const taskCards = context.tasks.map((task) => toTaskCard(task, taskIndex));
	return {
		project: {
			name: context.config.projectName,
			memoryDir: context.config.memoryDir
		},
		currentState: {
			summary: context.currentState.summary,
			focus: context.currentState.focus,
			activeSpecIds: snapshot.activeSpecIds,
			activeTaskIds: snapshot.activeTaskIds,
			nextActionHints: context.currentState.nextActionHints,
			updatedAt: context.currentState.updatedAt
		},
		counts: {
			specs: snapshot.specCount,
			tasks: snapshot.taskCount,
			activeSpecs: snapshot.activeSpecIds.length,
			inProgressTasks: snapshot.inProgressTasks.length,
			reviewTasks: snapshot.reviewTasks.length,
			blockedTasks: snapshot.blockedTasks.length,
			readyTasks: snapshot.readyTasks.length
		},
		nextActions,
		git: {
			available: context.git.available,
			branch: context.git.branch,
			dirty: context.git.dirty
		},
		agents: {
			ok: agentsReport.summary.ok,
			maxFileTokens: agentsReport.summary.maxFileTokens,
			maxChainTokens: agentsReport.summary.maxChainTokens,
			failures: agentsReport.failures
		},
		specs: context.specs.map((spec) => {
			const linkedTaskCards = spec.taskIds.map((taskId) => taskCards.find((task) => task.id === taskId)).filter((task) => Boolean(task));
			return {
				id: spec.id,
				title: spec.title,
				summary: spec.summary,
				status: spec.status,
				taskIds: spec.taskIds,
				linkedTaskCount: linkedTaskCards.length,
				progress: buildSpecProgress(linkedTaskCards)
			};
		}).sort((left, right) => left.id.localeCompare(right.id)),
		tasks: taskCards.sort((left, right) => left.priority - right.priority || left.id.localeCompare(right.id)),
		inProgressTasks: snapshot.inProgressTasks.map((task) => toTaskCard(task, taskIndex)),
		readyTasks: snapshot.readyTasks.map((item) => toTaskCard(item.task, taskIndex)),
		blockedTasks: snapshot.blockedTasks.map((item) => toTaskCard(item.task, taskIndex)),
		reviewTasks: snapshot.reviewTasks.map((item) => toTaskCard(item.task, taskIndex)),
		criticalPath: snapshot.criticalPath.map((task) => toTaskCard(task, taskIndex)),
		kanban: buildKanban(taskCards),
		timeline: buildTimeline(taskCards),
		recentHandoff: snapshot.recentHandoff ? {
			id: snapshot.recentHandoff.id,
			title: snapshot.recentHandoff.title,
			summary: snapshot.recentHandoff.summary,
			createdAt: snapshot.recentHandoff.createdAt
		} : void 0,
		dependencyIssues: snapshot.missingDependencies
	};
}
//#endregion
//#region src/lib/server/project-root.ts
function hasProjectConfig(dirPath) {
	return existsSync(join(dirPath, ".specpm", "config.toml"));
}
function resolveProjectRootFrom(startDir, configuredRoot) {
	if (configuredRoot && configuredRoot.trim().length > 0) return resolve(configuredRoot);
	let current = resolve(startDir);
	while (true) {
		if (hasProjectConfig(current)) return current;
		const parent = dirname(current);
		if (parent === current) break;
		current = parent;
	}
	throw new Error("Could not resolve the Spec Embryo project root. Set SPM_PROJECT_ROOT or run the UI from a repo with `.specpm/config.toml`.");
}
function resolveProjectRoot() {
	return resolveProjectRootFrom(process.cwd(), process.env.SPM_PROJECT_ROOT);
}
//#endregion
//#region src/routes/+layout.server.ts
var load = async () => {
	return { dashboard: await buildDashboardData(resolveProjectRoot()) };
};
//#endregion
export { load };
