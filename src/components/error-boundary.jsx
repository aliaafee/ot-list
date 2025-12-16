import FatalErrorModal from "@/modals/fatal-error-modal";
import React from "react";

/**
 * ErrorBoundary - React error boundary component for catching and displaying errors
 * Wraps the application to catch unhandled errors and show a fallback UI
 */
class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        // Update state so the next render shows fallback UI
        return { hasError: true, error };
    }

    componentDidCatch(error, errorInfo) {
        // You can also log the error to an error reporting service
        console.error("Error:", error, errorInfo);
    }

    render() {
        if (this.state.hasError) {
            return (
                <FatalErrorModal
                    message={`An error was detected with in the Error Boundary.`}
                    data={this.state.error}
                />
            );
        }

        return this.props.children;
    }
}

export default ErrorBoundary;
