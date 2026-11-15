const { default: SidebarLayout } = require("@/components/sidebar-layout");

function OTWorkspace() {
    return (
        <SidebarLayout
            sidebarTitle={"Cases"}
            open={() => {}}
            onClose={() => {}}
            sidebar={<div>List here</div>}
        >
            <div>Procedure Writer here</div>
        </SidebarLayout>
    );
}

export default OTWorkspace;
