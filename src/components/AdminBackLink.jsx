import { memo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

/**
 * AdminBackLink — العودة الموحّدة من أي قسم إداري إلى لوحة التحكم.
 * السهم يتجه يميناً لأن ذلك هو اتجاه "الرجوع" في واجهة عربية.
 */
const AdminBackLink = memo(function AdminBackLink({
  to = '/admin/dashboard',
  label = 'العودة للوحة التحكم',
}) {
  return (
    <Link
      to={to}
      className="mb-5 inline-flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/[0.06] px-3.5 py-2 text-xs font-bold text-slate-300 transition-colors hover:border-emerald-400/50 hover:bg-emerald-500/10 hover:text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
    >
      <ArrowRight size={15} />
      {label}
    </Link>
  );
});

export default AdminBackLink;
