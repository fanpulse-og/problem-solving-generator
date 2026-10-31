// The address is put together at run time so it doesn't sit whole in the page for scrapers.
const ADDRESS = ['zainhashim90', 'gmail.com'].join('@');
const SUBJECT = 'Maths tuition enquiry';

export const tuitionHref = () => `mailto:${ADDRESS}?subject=${encodeURIComponent(SUBJECT)}`;

/** Header button: opens an email about tuition. */
export function TuitionButton() {
  return (
    <a className="tuition" href={tuitionHref()} title={`Email ${ADDRESS} about tuition`}>
      <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <path d="m3 7 9 6 9-6" />
      </svg>
      Tuition
    </a>
  );
}
