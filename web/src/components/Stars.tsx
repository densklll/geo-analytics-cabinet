export function Stars({ value }: { value: number }) {
  return (
    <span className="stars" aria-label={`Оценка ${value} из 5`}>
      {'★'.repeat(value)}
      <span className="stars-empty">{'★'.repeat(5 - value)}</span>
    </span>
  );
}
