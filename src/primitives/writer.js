function checkAlloc(writer, size) {
    let needed = writer.byteOffset + size;
    let chunk = Math.max(Buffer.poolSize / 2, 1024);
    let chunkCount = (needed / chunk) >>> 0;

    if (writer.buffer.length >= needed)
        return;

    if ((needed % chunk) > 0) {
        chunkCount += 1;
    }

    let buffer = Buffer.alloc(chunkCount * chunk);
    writer.buffer.copy(buffer, 0, 0, writer.byteOffset);
    writer.buffer = buffer;
}

class Writer {
    constructor(size) {
        this.buffer = Buffer.alloc(size || Buffer.poolSize / 2)
        this.byteOffset = 0
    }
    writeUint8(value) {
        checkAlloc(this, 1);
        this.buffer.writeUInt8(value, this.byteOffset++)
    }
    writeInt8(value) {
        checkAlloc(this, 1);
        this.buffer.writeInt8(value, this.byteOffset++)
    }
    writeUint16(value) {
        checkAlloc(this, 2);
        this.buffer.writeUInt16LE(value, this.byteOffset)
        this.byteOffset += 2
    }
    writeInt16(value) {
        checkAlloc(this, 2);
        this.buffer.writeInt16LE(value, this.byteOffset)
        this.byteOffset += 2
    }
    writeUint32(value) {
        checkAlloc(this, 4);
        this.buffer.writeUInt32LE(value, this.byteOffset)
        this.byteOffset += 4
    }
    writeInt32(value) {
        checkAlloc(this, 4);
        this.buffer.writeInt32LE(value, this.byteOffset)
        this.byteOffset += 4
    }
    writeString(string) {
        checkAlloc(this, string.length + 1);
        for (let i = 0; i < string.length; i++) this.writeUint8(string.charCodeAt(i))
        this.writeUint8(0);
    }
    cut() {
        this.buffer = this.buffer.subarray(0, this.byteOffset);
        return this.buffer;
    }
}

module.exports = Writer;