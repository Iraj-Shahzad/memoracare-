export default function Logo({ className = "w-9 h-9" }: { className?: string }) {
  return (
    <div
      className={`${className} rounded-[10px] bg-gradient-to-br from-[#0d9488] to-[#1a3c34] flex items-center justify-center overflow-hidden`}
    >
      <img
        src="/images/memoracare.png"
        alt="MemoraCare"
        className="w-full h-full object-contain"
      />
    </div>
  );
}