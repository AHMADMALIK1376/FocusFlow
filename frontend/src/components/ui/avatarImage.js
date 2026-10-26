// Turns a picked photo into a small square picture the account can keep: centre-cropped and
// shrunk to 256 px, saved as JPEG (about 20-40 KB), so it also syncs to the account.
export const AVATAR_SIZE = 256;
export const MAX_PHOTO_BYTES = 10 * 1024 * 1024;

export function fileToAvatar(file) {
  return new Promise((resolve, reject) => {
    if (!file || !/^image\//.test(file.type || "")) return reject(new Error("Please choose an image file."));
    if (file.size > MAX_PHOTO_BYTES) return reject(new Error("That picture is too big (10 MB at most)."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const side = Math.min(img.naturalWidth, img.naturalHeight);
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = AVATAR_SIZE;
        canvas.getContext("2d").drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, AVATAR_SIZE, AVATAR_SIZE);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      } catch (e) {
        reject(new Error("Could not read that picture."));
      } finally {
        URL.revokeObjectURL(url);
      }
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read that picture.")); };
    img.src = url;
  });
}
