import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, parse } from 'node:path';

const photoRoot = join(process.cwd(), 'public', 'photo');
const imageExtensions = new Set(['.avif', '.jpeg', '.jpg', '.png', '.webp']);

const sectionSummaries: Record<string, string> = {
	dipinti: 'Tele e opere pittoriche dove materia, colore e gesto costruiscono paesaggi interiori.',
	disegni: 'Studi e lavori su carta, con soggetti essenziali e tratto diretto.',
};

const titleFromName = (name: string) =>
	name
		.replace(/[-_]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.replace(/\b\w/g, (letter) => letter.toUpperCase());

const infoKey = (title: string) =>
	title
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.replace(/[-_]+/g, ' ')
		.replace(/[^a-zA-Z0-9]+/g, ' ')
		.replace(/\s+/g, ' ')
		.trim()
		.toLowerCase();

const readArtworkInfo = (folder: string) => {
	const infoPath = join(photoRoot, folder, 'info.txt');

	if (!existsSync(infoPath)) {
		return new Map<string, string[]>();
	}

	return readFileSync(infoPath, 'utf8')
		.split(';')
		.reduce((infoMap, entry) => {
			const [rawTitle, ...rawInfoParts] = entry.split(':');
			const title = rawTitle?.trim();
			const rawInfo = rawInfoParts.join(':').trim();

			if (!title || !rawInfo) {
				return infoMap;
			}

			const details = rawInfo
				.split(',')
				.map((detail) => detail.trim())
				.filter(Boolean);

			if (details.length > 0) {
				infoMap.set(infoKey(title), details);
			}

			return infoMap;
		}, new Map<string, string[]>());
};

const portfolioFolders = existsSync(photoRoot)
	? readdirSync(photoRoot, { withFileTypes: true })
			.filter((item) => item.isDirectory())
			.map((item) => item.name)
			.sort((a, b) => a.localeCompare(b, 'it', { numeric: true }))
	: [];

export const portfolioSections = portfolioFolders
	.map((folder) => {
		const artworkInfo = readArtworkInfo(folder);
		const artworks = readdirSync(join(photoRoot, folder))
			.filter((item) => {
				const file = join(photoRoot, folder, item);
				return statSync(file).isFile() && imageExtensions.has(parse(item).ext.toLowerCase());
			})
			.sort((a, b) => a.localeCompare(b, 'it', { numeric: true }))
			.map((file) => {
				const title = titleFromName(parse(file).name);

				return {
					title,
					image: `/photo/${folder}/${file}`,
					info: artworkInfo.get(infoKey(title)) ?? [],
				};
			});

		return {
			title: titleFromName(folder),
			slug: folder,
			image: artworks[0]?.image ?? '',
			summary: sectionSummaries[folder] ?? `Raccolta di opere dalla sezione ${titleFromName(folder)}.`,
			artworks,
		};
	})
	.filter((section) => section.artworks.length > 0);
