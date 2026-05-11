export default function Loading() {
  return (
    <div className="max-w-2xl mx-auto space-y-5 animate-pulse">
      <div className="h-8 w-32 bg-gray-200 rounded" />
      <div className="flex gap-2">
        {[1, 2, 3, 4].map((i) => (
          <div key={i} className="h-6 w-20 bg-gray-100 rounded-full" />
        ))}
      </div>
      <div className="h-96 bg-gray-100 rounded-xl" />
    </div>
  );
}
