export default function VendorLoading() {
  return (
    <div className="min-h-screen bg-background-cream animate-pulse">
      {/* Hero skeleton */}
      <div className="h-48 bg-stone-200" />
      <div className="px-4 -mt-12 relative">
        <div className="bg-white rounded-2xl shadow-card p-5 space-y-3">
          <div className="h-6 w-2/3 bg-stone-200 rounded" />
          <div className="h-4 w-1/2 bg-stone-100 rounded" />
          <div className="h-4 w-3/4 bg-stone-100 rounded" />
        </div>
      </div>
      {/* Products skeleton */}
      <div className="px-4 mt-4 space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl p-4 flex gap-3 shadow-sm">
            <div className="w-20 h-20 bg-stone-200 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-1/2 bg-stone-200 rounded" />
              <div className="h-3 w-3/4 bg-stone-100 rounded" />
              <div className="h-5 w-1/4 bg-stone-200 rounded" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}