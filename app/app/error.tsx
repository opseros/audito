"use client";

export default function AppError({ reset }: { error: Error; reset: () => void }) {
  return (
    <div className="card mx-auto mt-10 flex max-w-lg flex-col gap-3 text-center">
      <h1 className="text-xl font-bold">That did not work</h1>
      <p className="m-0 text-sm text-muted">The action is not allowed for your role, or the item no longer exists.</p>
      <button className="btn mx-auto" onClick={reset}>
        Try again
      </button>
    </div>
  );
}
