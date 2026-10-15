import Button from '../Button';

export default function ErrorState({ message = 'Something went wrong.', onRetry }) {
  return (
    <div className="state state--error" role="alert">
      <h3 className="state__title">Could not load data</h3>
      <p className="state__text">{message}</p>
      {onRetry && (
        <Button variant="secondary" onClick={() => onRetry()}>
          Try again
        </Button>
      )}
    </div>
  );
}
