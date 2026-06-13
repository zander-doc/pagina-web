const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

async function createICO() {
  const src = 'addbox-web/assets/icons/logo-addbox-icon.png';
  const sizes = [16, 32, 48];
  
  // Create PNG buffers for each size
  const buffers = await Promise.all(
    sizes.map(s => sharp(src).resize(s, s).png().toBuffer())
  );
  
  // ICO format: header (6 bytes) + entries (16 bytes each) + image data
  const numImages = buffers.length;
  const headerSize = 6;
  const entrySize = 16;
  
  let totalDataOffset = headerSize + (entrySize * numImages);
  const entries = [];
  const imageData = [];
  
  for (let i = 0; i < numImages; i++) {
    const buf = buffers[i];
    const w = sizes[i] >= 256 ? 0 : sizes[i]; // 0 means 256
    const h = sizes[i] >= 256 ? 0 : sizes[i];
    
    entries.push({
      width: w,
      height: h,
      colorPalette: 0,
      reserved: 0,
      colorPlanes: 1,
      bitsPerPixel: 32,
      dataSize: buf.length,
      dataOffset: totalDataOffset
    });
    
    imageData.push(buf);
    totalDataOffset += buf.length;
  }
  
  // Build ICO buffer
  const icoBuffer = Buffer.alloc(totalDataOffset);
  let offset = 0;
  
  // Header
  icoBuffer.writeUInt16LE(0, offset); offset += 2; // reserved
  icoBuffer.writeUInt16LE(1, offset); offset += 2; // type: 1 = ICO
  icoBuffer.writeUInt16LE(numImages, offset); offset += 2; // number of images
  
  // Entries
  for (const entry of entries) {
    icoBuffer.writeUInt8(entry.width, offset); offset += 1;
    icoBuffer.writeUInt8(entry.height, offset); offset += 1;
    icoBuffer.writeUInt8(entry.colorPalette, offset); offset += 1;
    icoBuffer.writeUInt8(entry.reserved, offset); offset += 1;
    icoBuffer.writeUInt16LE(entry.colorPlanes, offset); offset += 2;
    icoBuffer.writeUInt16LE(entry.bitsPerPixel, offset); offset += 2;
    icoBuffer.writeUInt32LE(entry.dataSize, offset); offset += 4;
    icoBuffer.writeUInt32LE(entry.dataOffset, offset); offset += 4;
  }
  
  // Image data
  for (const buf of imageData) {
    buf.copy(icoBuffer, offset);
    offset += buf.length;
  }
  
  fs.writeFileSync('addbox-web/favicon.ico', icoBuffer);
  console.log('favicon.ico created successfully (' + icoBuffer.length + ' bytes)');
}

createICO().catch(console.error);