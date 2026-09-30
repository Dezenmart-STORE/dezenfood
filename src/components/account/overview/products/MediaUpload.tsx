import { ChangeEvent, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiImage, FiVideo, FiX } from "react-icons/fi";

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MAX_FILES = 5;
const ACCEPTED = /^(image\/(jpeg|jpg|png|gif|webp)|video\/mp4)$/;

export interface MediaFile {
  file: File;
  preview: string;
  type: "image" | "video";
}

interface Props {
  files: MediaFile[];
  onAdd: (incoming: MediaFile[]) => void;
  onRemove: (index: number) => void;
  error?: string;
}

const MediaUpload: React.FC<Props> = ({ files, onAdd, onRemove, error }) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    if (!selected.length) return;

    const valid: MediaFile[] = [];
    selected.forEach((file) => {
      if (file.size > MAX_FILE_SIZE) return;
      const kind = file.type.startsWith("image/")
        ? "image"
        : file.type.startsWith("video/")
        ? "video"
        : null;
      if (!kind || !ACCEPTED.test(file.type)) return;
      valid.push({ file, preview: URL.createObjectURL(file), type: kind });
    });

    if (valid.length) onAdd(valid);
  };

  return (
    <div>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        <AnimatePresence mode="popLayout">
          {files.map((media, i) => (
            <motion.div
              key={`${i}-${media.file.name}`}
              className="relative aspect-square rounded-xl overflow-hidden bg-[#3A3C41]"
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.85 }}
              transition={{ duration: 0.18 }}
              layout
            >
              {media.type === "image" ? (
                <img
                  src={media.preview}
                  alt={`Preview ${i + 1}`}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="relative w-full h-full">
                  <video
                    src={media.preview}
                    className="w-full h-full object-cover"
                    muted
                    preload="metadata"
                    playsInline
                    onMouseOver={(e) => {
                      const v = e.currentTarget;
                      v.paused && v.play().catch(() => {});
                    }}
                    onMouseOut={(e) => {
                      const v = e.currentTarget;
                      if (!v.paused) { v.pause(); v.currentTime = 0; }
                    }}
                  />
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <FiVideo className="text-white text-xl opacity-70" />
                  </div>
                </div>
              )}
              {i === 0 && (
                <span className="absolute bottom-1 left-1 text-[9px] bg-black/60 text-white rounded px-1 py-0.5">
                  Main
                </span>
              )}
              <button
                type="button"
                onClick={() => onRemove(i)}
                aria-label={`Remove media ${i + 1}`}
                className="absolute top-1 right-1 bg-black/60 rounded-full p-1 text-white hover:bg-brand-hover transition-colors"
              >
                <FiX size={11} />
              </button>
            </motion.div>
          ))}

          {files.length < MAX_FILES && (
            <motion.button
              type="button"
              onClick={() => inputRef.current?.click()}
              aria-label="Add media"
              className="aspect-square rounded-xl border-2 border-dashed border-gray-600 flex flex-col items-center justify-center text-gray-500 hover:border-red-500 hover:text-red-400 transition-colors"
              layout
              whileTap={{ scale: 0.96 }}
            >
              <div className="flex gap-1.5">
                <FiImage size={15} />
                <FiVideo size={15} />
              </div>
              <span className="text-[10px] mt-1">Add</span>
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <input
        ref={inputRef}
        type="file"
        multiple
        accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,video/mp4"
        onChange={handleChange}
        className="hidden"
        aria-hidden="true"
      />

      {error && (
        <p className="text-red-400 text-xs mt-2" role="alert">{error}</p>
      )}
      <p className="text-gray-500 text-xs mt-1.5">
        Up to {MAX_FILES} files · Max 5 MB each · JPG, PNG, GIF, WebP, MP4
        {files.length > 0 && ` · ${files.length}/${MAX_FILES} added`}
      </p>
    </div>
  );
};

export default MediaUpload;
