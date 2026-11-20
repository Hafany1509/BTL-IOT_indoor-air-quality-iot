import { ErrorMessage } from './ErrorMessage';
import { LoadingSkeleton } from './LoadingSkeleton';
export function QueryState({ query, children }) {
  if (query.loading && query.data === undefined) return <LoadingSkeleton />;
  return <>
    <ErrorMessage error={query.error} retry={query.reload} />
    {query.data !== undefined && children(query.data)}
  </>;
}
