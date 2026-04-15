const fs = require('fs/promises');
const path = require('path');
const zlib = require('zlib');

const DEFAULT_CHUNK_SIZE = 4096;
const HEADER_SIZE = 16;
const PRG_ROM_BANK_SIZE = 16 * 1024;
const CHR_ROM_BANK_SIZE = 8 * 1024;

async function main() {
	const [inputFilePath, chunkSizeArg] = process.argv.slice(2);

	if (!inputFilePath) {
		throw new Error('Usage: node extract_rom.js <input.nes> [chunkSizeBytes]');
	}

	const chunkSize = parsePositiveInteger(chunkSizeArg, DEFAULT_CHUNK_SIZE);
	const resolvedInputFilePath = path.resolve(process.cwd(), inputFilePath);
	const romBuffer = await fs.readFile(resolvedInputFilePath);

	const rom = parseINesRom(romBuffer);

	printMetadata(resolvedInputFilePath, rom);

	const outputDirectory = path.dirname(resolvedInputFilePath);
	const prgOutputPath = path.join(outputDirectory, 'rom_prg.txt');
	const chrOutputPath = path.join(outputDirectory, 'rom_chr.txt');

	const prgLines = encodeChunksAsBase64(rom.prgRom, chunkSize);
	const chrLines = encodeChunksAsBase64(rom.chrRom, chunkSize);

	await fs.writeFile(prgOutputPath, prgLines.join('\n'), 'utf8');
	await fs.writeFile(chrOutputPath, chrLines.join('\n'), 'utf8');

	console.log(`Wrote ${prgLines.length} PRG chunk(s) to ${prgOutputPath}`);
	console.log(`Wrote ${chrLines.length} CHR chunk(s) to ${chrOutputPath}`);
}

function parseINesRom(buffer) {
	if (buffer.length < HEADER_SIZE) {
		throw new Error('File is too small to be a valid iNES ROM');
	}

	const header = buffer.subarray(0, HEADER_SIZE);
	if (header[0] !== 0x4e || header[1] !== 0x45 || header[2] !== 0x53 || header[3] !== 0x1a) {
		throw new Error('Invalid iNES header magic');
	}

	const prgRomBanks = header[4];
	const chrRomBanks = header[5];
	const flags6 = header[6];
	const flags7 = header[7];
	const prgRamBanks = header[8] || 1;
	const tvSystem1 = header[9];
	const tvSystem2 = header[10];
	const trainerPresent = (flags6 & 0x04) !== 0;

	let offset = HEADER_SIZE;
	if (trainerPresent) {
		offset += 512;
	}

	const prgRomSize = prgRomBanks * PRG_ROM_BANK_SIZE;
	const chrRomSize = chrRomBanks * CHR_ROM_BANK_SIZE;

	if (buffer.length < offset + prgRomSize + chrRomSize) {
		throw new Error('ROM file is truncated for the declared PRG/CHR sizes');
	}

	const prgRom = buffer.subarray(offset, offset + prgRomSize);
	offset += prgRomSize;

	const chrRom = buffer.subarray(offset, offset + chrRomSize);

	return {
		header,
		metadata: {
			prgRomBanks,
			chrRomBanks,
			prgRomSize,
			chrRomSize,
			mapperNumber: ((flags7 & 0xf0) | (flags6 >> 4)),
			mirroring: (flags6 & 0x08) !== 0 ? 'four-screen' : ((flags6 & 0x01) !== 0 ? 'vertical' : 'horizontal'),
			batteryBackedPrgRam: (flags6 & 0x02) !== 0,
			trainerPresent,
			vsUnisystem: (flags7 & 0x01) !== 0,
			playChoice10: (flags7 & 0x02) !== 0,
			nes2Format: ((flags7 & 0x0c) === 0x08),
			prgRamBanks,
			tvSystem1,
			tvSystem2,
		},
		prgRom,
		chrRom,
	};
}

function printMetadata(filePath, rom) {
	const { metadata } = rom;

	console.log(`Input: ${filePath}`);
	console.log('iNES metadata:');
	console.log(`  PRG ROM banks: ${metadata.prgRomBanks}`);
	console.log(`  CHR ROM banks: ${metadata.chrRomBanks}`);
	console.log(`  PRG ROM size: ${metadata.prgRomSize} bytes`);
	console.log(`  CHR ROM size: ${metadata.chrRomSize} bytes`);
	console.log(`  Mapper: ${metadata.mapperNumber}`);
	console.log(`  Mirroring: ${metadata.mirroring}`);
	console.log(`  Battery-backed PRG RAM: ${metadata.batteryBackedPrgRam}`);
	console.log(`  Trainer present: ${metadata.trainerPresent}`);
	console.log(`  VS Unisystem: ${metadata.vsUnisystem}`);
	console.log(`  PlayChoice-10: ${metadata.playChoice10}`);
	console.log(`  NES 2.0 format: ${metadata.nes2Format}`);
	console.log(`  PRG RAM banks: ${metadata.prgRamBanks}`);
	console.log(`  TV system byte 1: ${metadata.tvSystem1}`);
	console.log(`  TV system byte 2: ${metadata.tvSystem2}`);
}

function encodeChunksAsBase64(data, chunkSize) {
	if (data.length === 0) {
		return [];
	}

	const lines = [];

	for (let offset = 0; offset < data.length; offset += chunkSize) {
		const chunk = data.subarray(offset, Math.min(offset + chunkSize, data.length));
		//const gzipped = zlib.gzipSync(chunk);
		const gzipped = chunk;
		lines.push(gzipped.toString('base64'));
	}

	return lines;
}

function parsePositiveInteger(value, fallback) {
	if (value === undefined) {
		return fallback;
	}

	const parsed = Number(value);
	if (!Number.isInteger(parsed) || parsed <= 0) {
		throw new Error(`Invalid chunk size: ${value}`);
	}

	return parsed;
}

main().catch((error) => {
	console.error(error.message);
	process.exitCode = 1;
});
