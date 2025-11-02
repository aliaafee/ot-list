import FormField from "@/components/form-field";

function ChangePasswordForm({ value, onChange, errors = {} }) {
    const handleChange = (e) => {
        const { name, value: newValue } = e.target;

        onChange({ ...value, [name]: newValue });
    };

    return (
        <form className="w-full">
            <FormField
                label="Current Password"
                name="current"
                type="password"
                value={value.current}
                className="w-full"
                onChange={handleChange}
                error={!!errors?.oldPassword}
                errorMessage={errors?.oldPassword?.message}
            />

            <FormField
                label="New Password"
                name="new"
                type="password"
                value={value.new}
                className="w-full"
                onChange={handleChange}
                error={!!errors?.password}
                errorMessage={errors?.password?.message}
            />

            <FormField
                label="Confirm Password"
                name="confirm"
                type="password"
                value={value.confirm}
                className="w-full"
                onChange={handleChange}
                error={!!errors?.passwordConfirm}
                errorMessage={errors?.passwordConfirm?.message}
            />
        </form>
    );
}

export default ChangePasswordForm;
