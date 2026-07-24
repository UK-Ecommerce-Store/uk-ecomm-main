/* eslint-disable @next/next/no-img-element */
export function ProductMedia({ imageUrl, name, className = "" }: { imageUrl: string | null; name: string; className?: string }) {
  return (
    <div className={`relative grid overflow-hidden bg-[#f1f6ef] ${className}`}>
      {imageUrl ? <img src={imageUrl} alt={name} className="h-full w-full object-cover" /> : (
        <div className="m-auto px-5 text-center"><span className="block text-2xl font-semibold tracking-[-.05em] text-[#91a095]">{name.slice(0, 2).toUpperCase()}</span><span className="mt-2 block text-[10px] font-semibold uppercase tracking-[.16em] text-[#8f9c92]">Image pending</span></div>
      )}
    </div>
  );
}
