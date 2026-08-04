import { useLocation, useNavigate } from "react-router";
import ErrorModal from "@/modals/error-modal";
import ButtonLink from "@/components/button-link";

/**
 * NotFound - Fallback page for unmatched routes
 * Shows an error modal and returns to the home route when closed
 */
export default function NotFound() {
    const location = useLocation();
    const navigate = useNavigate();

    return (
        <ErrorModal
            message={
                <>
                    The page "{location.pathname}" was not found.
                    <ButtonLink to="/" replace variant="link" size="sm">
                        Return to home
                    </ButtonLink>
                </>
            }
            onClose={() => navigate("/", { replace: true })}
        />
    );
}
