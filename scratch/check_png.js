const fs = require('fs');

function getPngDimensions(filePath) {
    const buffer = fs.readFileSync(filePath);
    // PNG signature is 8 bytes, IHDR chunk starts at byte 8, length is 4 bytes, chunk type is 4 bytes, then width (4) and height (4)
    if (buffer.toString('hex', 0, 8) !== '89504e470d0a1a0a') return null;
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
}

const dir = 'C:\\Users\\elija\\OneDrive\\Documents\\SOULS\\Sprites\\ENEMIES\\FAMINE\\';
['RAT_WALK.png', 'RAT_RUN.png', 'RAT_ATTACK.png'].forEach(file => {
    try {
        console.log(file, getPngDimensions(dir + file));
    } catch(e) {
        console.error(file, e.message);
    }
});
