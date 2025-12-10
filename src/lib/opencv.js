import cvModule from "@techstark/opencv-js";
let cvInstance = null;

async function getOpenCv() {
    if (cvInstance) {
        return cvInstance;
    }

    let cv;
    if (cvModule instanceof Promise) {
        cv = await cvModule;
    } else {
        await new Promise((resolve) => {
            cvModule.onRuntimeInitialized = () => resolve();
        });
        cv = cvModule;
    }
    cvInstance = { cv };
    return cvInstance;
}

export { getOpenCv };
