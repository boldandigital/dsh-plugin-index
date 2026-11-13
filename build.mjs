#!/usr/bin/env node
/**
 * Rebuild index.json for the boldandigital plugin index.
 *
 * The index follows the DeepSeek Harness plugin market format, version 1:
 * <https://github.com/deepseek-ai/deepseek-harness/blob/master/.agents/notes/implemented/feature/2026-10-02-plugin-market-index-format.md>
 *
 * Everything in it is read from the npm registry, so the file never claims a
 * version the registry does not have.
 *
 *   node build.mjs
 */
import { writeFileSync } from 'node:fs';

const PLUGINS = [
	{
		name: 'dsh-google-drive',
		title: { en: 'Google Drive accounts' },
		description: {
			en: 'Adds a Google Drive tab to the sidebar. A guided wizard sets you up: sign in with Google or connect a service account, reusing the OAuth clients and keys this Mac already has. Then browse the account\'s files.',
			zh: '在侧边栏添加 Google Drive 选项卡。通过引导式向导进行设置：使用 Google 登录或连接服务账号，然后浏览账号中的文件。',
		},
		author: 'boldandigital',
		homepage: 'https://github.com/boldandigital/dsh-google-drive',
		repository: { url: 'https://github.com/boldandigital/dsh-google-drive' },
		category: 'integration',
		keywords: ['google-drive', 'drive', 'google', 'oauth', 'service-account', 'files'],
	},
	{
		name: 'dsh-free-subagents',
		title: { en: 'Free Subagents' },
		description: {
			en: 'Route delegated subagents and Agent Teams over free-tier models: pick a pool of approved free routes once, and every child request fails over to the next free model with a persistent ledger of quota, rate-limit and timeout parks. Per-route reasoning effort, task-aware route selection.',
		},
		author: 'boldandigital',
		homepage: 'https://github.com/boldandigital/dsh-free-subagents',
		repository: { url: 'https://github.com/boldandigital/dsh-free-subagents' },
		category: 'model',
		keywords: ['subagent', 'free-tier', 'router', 'fallback', 'quota', 'agent-teams'],
	},
	{
		name: 'dsh-minimax-quota',
		title: { en: 'MiniMax Quota' },
		description: {
			en: 'Shows the remaining MiniMax Token Plan quota next to the composer, with the 5-hour and weekly windows and their reset times. The API key stays in the harness credential store: the browser never sees it.',
		},
		author: 'boldandigital',
		homepage: 'https://github.com/boldandigital/dsh-minimax-quota',
		repository: { url: 'https://github.com/boldandigital/dsh-minimax-quota' },
		category: 'integration',
		keywords: ['minimax', 'quota', 'usage', 'token-plan', 'chip'],
	},
];

const ICON_BYTES_LIMIT = 32 * 1024;

/**
 * Read one package's document from the registry.
 *
 * @param {string} name - the package name.
 * @returns {Promise<object|null>} the registry document.
 */
async function registryDocument(name) {
	const response = await fetch(`https://registry.npmjs.org/${name}`);
	if (!response.ok) return null;
	return await response.json();
}

/**
 * The version the registry points `latest` at, when it was published, and the
 * `engines` its own manifest declares.
 *
 * The engines come from the package, not from this file: the index must
 * mirror the manifest it points at, or the harness refuses the install for a
 * reason the listing never mentioned.
 *
 * @param {object} document - the registry document.
 * @returns {{version: string, publishTimestamp: number, engines: object|null}} the version, its time and its engines.
 */
function latestVersion(document) {
	const version = document?.['dist-tags']?.latest;
	const published = document?.time?.[version];
	if (typeof version !== 'string' || typeof published !== 'string') return null;
	const engines = document?.versions?.[version]?.engines;
	return {
		version,
		publishTimestamp: Math.floor(Date.parse(published) / 1000),
		engines: engines && typeof engines === 'object' ? engines : null,
	};
}

/**
 * The package icon, as a data URL the index format accepts.
 *
 * The CDN serves a freshly published version only once it has fetched the
 * tarball, which takes a moment after npm accepts the publish. A build that
 * runs in that window sees a 404 and would drop the icon from the index, so
 * a miss is retried a few times before it is believed.
 *
 * @param {string} name - the package name.
 * @param {string} version - the version to read the icon from.
 * @returns {Promise<string|null>} the data URL, or null when there is none.
 */
async function iconDataUrl(name, version) {
	const url = `https://cdn.jsdelivr.net/npm/${name}@${version}/assets/icon.svg`;
	for (let attempt = 1; attempt <= 4; attempt++) {
		try {
			const response = await fetch(url);
			if (response.ok) {
				const bytes = Buffer.from(await response.arrayBuffer());
				if (bytes.length > 0 && bytes.length <= ICON_BYTES_LIMIT) {
					return `data:image/svg+xml;base64,${bytes.toString('base64')}`;
				}
				return null;
			}
		} catch {
			// fall through to the retry
		}
		if (attempt < 4) {
			await new Promise(resolve => setTimeout(resolve, 3000 * attempt));
		}
	}
	return null;
}

const plugins = [];
for (const plugin of PLUGINS) {
	const document = await registryDocument(plugin.name);
	const latest = document ? latestVersion(document) : null;
	if (!latest) {
		console.error(`skipped ${plugin.name}: the registry has no version`);
		continue;
	}
	const icon = await iconDataUrl(plugin.name, latest.version);
	const entry = {
		name: plugin.name,
		title: plugin.title,
		description: plugin.description,
		...(icon ? { icon } : {}),
		author: plugin.author,
		homepage: plugin.homepage,
		repository: plugin.repository,
		metadata: {
			category: plugin.category,
			labels: ['npm'],
			keywords: plugin.keywords,
			sortKeys: { stars: 0 },
		},
		'dist-tags': { latest: latest.version },
		versions: [
			{
				version: latest.version,
				publishTimestamp: latest.publishTimestamp,
				source: { type: 'npm' },
				engines: latest.engines ?? { dsh: '>=0.2.0' },
			},
		],
	};
	plugins.push(entry);
	console.log(`${plugin.name} ${latest.version}`);
}

const index = {
	format: 1,
	title: { en: 'boldandigital plugins', zh: 'boldandigital 插件' },
	description: {
		en: 'Plugins by boldandigital for the DeepSeek Harness.',
		zh: 'boldandigital 为 DeepSeek Harness 开发的插件。',
	},
	metadata: {
		categories: {
			integration: { title: { en: 'Integrations & Connections', zh: '集成与连接' } },
			model: { title: { en: 'Models & Reasoning', zh: '模型与推理' } },
		},
		labels: {
			npm: { title: { en: 'On npm', zh: '已发布到 npm' } },
		},
		sortKeys: {
			stars: { title: { en: 'Stars', zh: '星标' }, order: 'desc' },
		},
	},
	plugins,
};

writeFileSync('index.json', `${JSON.stringify(index, null, 2)}\n`);
console.log(`wrote index.json with ${plugins.length} plugin(s)`);
