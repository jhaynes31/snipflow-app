import { Link } from 'react-router-dom';
import { APP_NAME } from '@/app/config';

export function DisclaimerPage() {
  return (
    <div className="page stack fade-in">
      <h1>Not medical advice</h1>
      <p>{APP_NAME} is a personal training and movement companion. It cannot diagnose, treat, or replace a physical therapist, doctor, or other licensed professional.</p>
      <p>Given your history (neck, ankles, left knee, balance), one in-person physical therapy evaluation is strongly recommended. Anything a real PT tells you overrides anything in this app. You can add their exercises and restrictions under <Link to="/pt-plan" className="underline">My PT's Plan</Link>.</p>
      <p>Stop and seek care for sharp, stabbing or shooting pain; numbness or tingling; sudden swelling; pain lasting days after a session; a joint giving way or locking. Call emergency services for chest pain, unusual shortness of breath, dizziness or fainting.</p>
      <Link to="/" className="btn btn-ghost">Back</Link>
    </div>
  );
}
