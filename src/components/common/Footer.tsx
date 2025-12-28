interface FooterProps {
    className?: string;
}

export default function Footer({ className = '' }: FooterProps) {
    return (
        <div className={`text-center py-6 ${className}`}>
            <p className="text-slate-400 text-sm">
                Made by{' '}
                <a
                    href="https://www.linkedin.com/in/shiva-pranav-4b62a71a2/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-indigo-400 hover:text-indigo-300 transition-colors font-medium"
                >
                    Shiva Pranav
                </a>{' '}
                ❤️
            </p>
        </div>
    );
}
