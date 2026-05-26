import { Link } from 'react-router-dom';
import { PageHeader } from '../components/PageHeader';

export default function NotFound() {
  return (
    <>
      <PageHeader
        title="Not found"
        description="That route doesn't exist in the shell yet."
      />
      <Link to="/" className="btn-primary">
        Back to Dashboard
      </Link>
    </>
  );
}
