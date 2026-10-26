import { fileToAvatar, AVATAR_SIZE, MAX_PHOTO_BYTES } from "./avatarImage";

let drawn;
beforeEach(() => {
  drawn = null;
  global.URL.createObjectURL = jest.fn(() => "blob:x");
  global.URL.revokeObjectURL = jest.fn();
  HTMLCanvasElement.prototype.getContext = () => ({ drawImage: (...a) => { drawn = a; } });
  HTMLCanvasElement.prototype.toDataURL = jest.fn(() => "data:image/jpeg;base64,small");
});
function fakeImage(w, h, fail) {
  global.Image = class {
    set src(_) { setTimeout(() => (fail ? this.onerror() : this.onload()), 0); }
    get naturalWidth() { return w; }
    get naturalHeight() { return h; }
  };
}
const photo = (type = "image/png", size = 1000) => ({ type, size });

test("a wide photo is cropped to a centred square and shrunk to 256 px", async () => {
  fakeImage(800, 400);
  await expect(fileToAvatar(photo())).resolves.toBe("data:image/jpeg;base64,small");
  expect(drawn.slice(1)).toEqual([200, 0, 400, 400, 0, 0, AVATAR_SIZE, AVATAR_SIZE]);
  expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith("image/jpeg", 0.85);
  expect(URL.revokeObjectURL).toHaveBeenCalled();
});

test("a tall photo is cropped around its middle", async () => {
  fakeImage(300, 900);
  await fileToAvatar(photo());
  expect(drawn.slice(1, 5)).toEqual([0, 300, 300, 300]);
});

test("non-images, huge files and unreadable pictures are refused with a plain message", async () => {
  fakeImage(10, 10);
  await expect(fileToAvatar(photo("application/pdf"))).rejects.toThrow(/image file/);
  await expect(fileToAvatar(undefined)).rejects.toThrow(/image file/);
  await expect(fileToAvatar(photo("image/png", MAX_PHOTO_BYTES + 1))).rejects.toThrow(/too big/);
  fakeImage(10, 10, true);
  await expect(fileToAvatar(photo())).rejects.toThrow(/Could not read/);
  expect(URL.revokeObjectURL).toHaveBeenCalled();
});
