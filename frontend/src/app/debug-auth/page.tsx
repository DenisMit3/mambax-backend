import { redirect } from 'next/navigation';

// Дебаг-страница удалена — редирект на главную
export default function DebugAuth() {
    redirect('/');
}
