// @flow

import { convertPipelineToJson, convertJsonToInternalModel } from './PipelineSyntaxConverter';

/**
 * A stage in a pipeline
 */
export type StageInfo = {
    name: string,
    id: number,
    children: StageInfo[],
    steps: StepInfo[],
};

/**
 * An individual step within a single pipeline stage
 */
export type StepInfo = {
    id: number,
    name: string,
    label: string,
    isContainer: bool,
    children: StepInfo[],
    data: any,
};

export type PipelineInfo = StageInfo & {
    agent: StepInfo,
};

function _copy<T>(obj: T): ?T {
    if (!obj) {
        return null;
    }
    // TODO: This is awful, use a lib
    return JSON.parse(JSON.stringify(obj));
}

let idSeq = -11111;

function createBasicStage(name:string):StageInfo {
    return {
        name,
        id: idSeq--,
        children: [],
        steps: [],
    };
}

/**
 * Search through candidates (and their children, recursively) to see if any is the parent of the stage
 */
function findParentStage(container:StageInfo, childStage:StageInfo, safetyValve:number = 5):?StageInfo {
    // TODO: TESTS
    if (!container || !container.children || container.children.length == 0 || safetyValve < 1) {
        return null;
    }

    for (const child of container.children) {
        if (child.id === childStage.id) {
            return container;
        }

        const foundParent = findParentStage(child, childStage, safetyValve - 1);

        if (foundParent) {
            return foundParent;
        }
    }

    return null;
}

const findStepById = function (steps, id) {
    const step = steps.filter(i => i.id === id);
    if (step.length) {
        return step[0];
    }
    for (let s of steps) {
        if (s.isContainer) {
            const children = s.children;
            if (children) {
                const childStep = findStepById(children, id);
                if (childStep) {
                    return childStep;
                }
            }
        }
    }
};


const findParentStepByChildId = function (steps, id) {
    for (let s of steps) {
        if (s.isContainer) {
            const children = s.children;
            if (children) {
                for (let c of children) {
                    if (c.id === id) {
                        return s;
                    }
                }
                const childStep = findParentStepByChildId(children, id);
                if (childStep) {
                    return childStep;
                }
            }
        }
    }
};

// TODO: mobxify
class PipelineStore {
    pipeline: StageInfo;

    createSequentialStage(name:string) {
        const { pipeline } = this;

        let newStage = createBasicStage(name);
        const stageId = newStage.id;

        pipeline.children = [...pipeline.children, newStage];
        this.notify();
        return newStage;
    }

    createParallelStage(name:string, parentStage:StageInfo) {
        let updatedChildren = [...parentStage.children]; // Start with a shallow copy, we'll add one or two to this

        let newStage = createBasicStage(name);

        if (parentStage.children.length == 0) {
            // Converting a normal stage with steps into a container of parallel branches, so there's more to do
            let zerothStage = createBasicStage(parentStage.name);

            // Move any steps from the parent stage into the new zeroth stage
            zerothStage.steps = parentStage.steps;
            parentStage.steps = []; // Stages with children can't have steps

            updatedChildren.push(zerothStage);
        }

        updatedChildren.push(newStage); // Add the user's newStage to the parent's child list

        parentStage.children = updatedChildren;
        this.notify();
        return newStage;
    }

    findParentStage(selectedStage: StageInfo) {
        return findParentStage(this.pipeline, selectedStage);
    }
    
    /**
     * Delete the selected stage from our stages list. When this leaves a single-branch of parallel jobs, the steps
     * will be moved to the parent stage, and the lone parallel branch will be deleted.
     *
     * Assumptions:
     *      * The Graph is valid, and contains selectedStage
     *      * Only top-level stages can have children (ie, graph is max depth of 2).
     */
    deleteStage(selectedStage:StageInfo) {
        const parentStage = this.findParentStage(selectedStage) || this.pipeline;

        // For simplicity we'll just copy the stages list and then mutate it
        let newStages = [...parentStage.children];

        // We will set this differently depending on our deletion logic
        let newSelectedStage:?StageInfo = null;

        // First, remove selected stage from parent list

        let newChildren = [...parentStage.children];
        let idx = newChildren.indexOf(selectedStage);
        newChildren.splice(idx, 1);

        // Then check to see if there's more to do
        if (newChildren.length > 1) {
            // Still have multiple parallel branches, so select the next or last child stage
            newSelectedStage = newChildren[Math.min(idx, newChildren.length - 1)];
        } else {
            // We can't have a single parallel stage, so we delete it and move its steps to the parent
            let onlyChild = newChildren[0];
            newChildren = [];
            parentStage.steps = onlyChild.steps;

            newSelectedStage = parentStage; // Will be set to updated below
        }

        // Update the parent with new children list
        parentStage.children = newChildren;

        // If we've selected a stage which has children, we need to select its first child instead.
        // Parent stages aren't shown in the graph so aren't selectable; only the name is shown above a column.
        if (newSelectedStage && newSelectedStage.children.length) {
            newSelectedStage = newSelectedStage.children[0];
        }
        this.notify();
    }

    addStep(selectedStage: StageInfo, parentStep: StepInfo, step: any) {
        if (!selectedStage) {
            return;
        }

        const oldStepsForStage = selectedStage.steps || [];
        let newStepsForStage = oldStepsForStage;

        let newStep:StepInfo = {
            id: --idSeq,
            isContainer: step.isBlockContainer,
            children: [],
            name: step.functionName,
            label: step.displayName,
            data: {}
        };

        if (parentStep != null) {
            const parent = findStepById(oldStepsForStage, parentStep.id);
            if (parent) {
                parent.children = parent.children || [];
                parent.children.push(newStep);
            }
            else {
                throw new Error('unable to find step: ' + parentStep.id);
            }
        }
        else {
            newStepsForStage = [...oldStepsForStage, newStep];
        }

        selectedStage.steps = newStepsForStage;
        this.notify();
    }

    deleteStep(selectedStage: StageInfo, step:StepInfo) {
        if (!selectedStage) {
            return;
        }

        const oldStepsForStage = selectedStage.steps || [];
        let newStepsForStage = oldStepsForStage;
        let newSelectedStep;

        const parent = findParentStepByChildId(oldStepsForStage, step.id);
        if (parent) {
            const stepIdx = parent.children.indexOf(step);

            if (stepIdx < 0) {
                return;
            }

            parent.children = [
                ...(parent.children.slice(0, stepIdx)),
                ...(parent.children.slice(stepIdx + 1))
            ];
            
            newSelectedStep = parent;
        }
        else { // no parent
            const stepIdx = oldStepsForStage.indexOf(step);

            if (stepIdx < 0) {
                return;
            }

            selectedStage.steps = [
                ...(oldStepsForStage.slice(0, stepIdx)),
                ...(oldStepsForStage.slice(stepIdx + 1))
            ];

            let newSelectedStepIdx = Math.min(stepIdx, newStepsForStage.length - 1);
            newSelectedStep = newStepsForStage[newSelectedStepIdx];
        }
        this.notify();
    }

    updateStateFromPipelineScript(pipeline: string, onComplete: Function, onError: Function) {
        convertPipelineToJson(pipeline, p => {
            const internal = convertJsonToInternalModel(p);
            this.setPipeline(internal);
        });
    }

    setPipeline(pipeline) {
        this.pipeline = pipeline;
        this.notify();
    }

    notify() {
        console.log('current pipeline: ', this.pipeline);
        this.listeners.map(l => l());
    }

    addListener(fn) {
        this.listeners = this.listeners || [];
        this.listeners.push(fn);
    }

    removeListener(fn) {
        const idx = this.listeners.indexOf(fn);
        this.listeners.splice(idx, 1);
    }
}

const pipelineStore = new PipelineStore();

export default pipelineStore;
