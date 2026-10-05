export default function ApplicationLogo({ className = '', ...props }) {
    return (
        <img
            src="/images/logo.jpg"
            alt="RITTA ฤทธา"
            className={`object-contain ${className}`}
            {...props}
        />
    );
}

