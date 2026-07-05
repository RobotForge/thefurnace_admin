import './globals.css';
import { AuthProvider } from '@/context/AuthContext';

export const metadata = {
  title: 'RobotForge Admin',
  description: 'Internal admin dashboard',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
