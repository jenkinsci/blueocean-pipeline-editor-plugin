// @flow

import React, { Component, PropTypes } from 'react';
import { EditorPipelineGraph } from './EditorPipelineGraph';
import { EditorStepList } from './EditorStepList';
import { EditorStepDetails } from './EditorStepDetails';
import { EmptyStateView } from '@jenkins-cd/design-language';
import { AddStepSelectionDialog } from './AddStepSelectionDialog';
import pipelineStore from '../../services/PipelineStore';
import type { StageInfo, StepInfo } from '../../services/PipelineStore';

type Props = {
};

type State = {
    selectedStage: ?StageInfo,
    selectedStep: ?StepInfo,
    showSelectStep: ?boolean,
    parentStep: ?StepInfo,
};

type DefaultProps = typeof EditorMain.defaultProps;
export class EditorMain extends Component<DefaultProps, Props, State> {

    static defaultProps = {};

    //static propTypes = {...}
    // TODO: React proptypes ^^^

    props:Props;
    state:State;
    pipelineUpdated: Function;

    componentWillMount() {
        this.handleProps(
            this.props,
            this.props,
            this.state);
        pipelineStore.addListener(this.pipelineUpdated = p => this.doUpdate());
    }

    componentWillUnmount() {
        pipelineStore.removeListener(this.pipelineUpdated);
    }

    doUpdate() {
        this.forceUpdate();
    }

    componentWillReceiveProps(nextProps:Props) {
        //this.handleProps(nextProps, this.props, this.state);
    }

    createSequentialStage(name:string) {
        const newStage = pipelineStore.createSequentialStage(name);
        this.setState({
            selectedStage: newStage,
            selectedStep: null
        });
    }
    createParallelStage(name:string, parentStage:StageInfo) {
        let newStage = pipelineStore.createParallelStage(name, parentStage);
        this.setState({
            selectedStage: newStage,
            selectedStep: null
        });
    }
    
    handleProps(nextProps:Props, oldProps:Props, state:State) {

        let updates = {},
            stagesChanged = false,
            stageStepsChanged = false;

        // Update stages list?
        if (nextProps.pipeline && nextProps.pipeline.children !== oldProps.pipeline.children) {
            let stages = nextProps.pipeline.children;
            updates.selectedStage = (stages && stages[0]) || null;
            stagesChanged = true;
        }

        // If we've changed either stages or steps, we need a new selectedStep
        if (stagesChanged || stageStepsChanged) {
            let selectedStep = null; // If we don't find a first step we'll clear any old value

            let selectedStage = stagesChanged ? updates.selectedStage : state.selectedStage;

            if (selectedStage) {
                let stepsForStage = selectedStage.steps;
                if (stepsForStage && stepsForStage.length) {
                    selectedStep = stepsForStage[0];
                }
            }

            updates.selectedStep = selectedStep;
        }

        this.setState(updates);
    }

    graphSelectedStageChanged(newSelectedStage:?StageInfo) {
        let newSelectedStep = null;

        if (newSelectedStage) {
            const stepsForStage = newSelectedStage.steps || [];
            newSelectedStep = stepsForStage[0] || null;
        }

        this.setState({
            selectedStage: newSelectedStage,
            selectedStep: newSelectedStep
        });
    }

    openSelectStepDialog(parentStep: ?StepInfo = null) {
        this.setState({showSelectStep: true, parentStep: parentStep});
    }

    selectedStepChanged(selectedStep:StepInfo) {
        this.setState({selectedStep});
    }

    stepDataChanged(newValue:any) {

        const {selectedStep} = this.state;

        if (!selectedStep) {
            console.log("unable to set new step data, no currently selected step");
            return;
        }
        selectedStep.data = newValue;
        this.setState({
            selectedStep: selectedStep
        });
    }

    deleteStageClicked(e:HTMLEvent) {
        e.target.blur(); // Don't leave ugly selection highlight

        const {selectedStage} = this.state;

        if (selectedStage) {
            pipelineStore.deleteStage(selectedStage);
        }
    }

    render() {
        const {selectedStage, selectedStep} = this.state;
        const steps = selectedStage ? selectedStage.steps : [];

        const title = selectedStage ? selectedStage.name : 'Select or create a pipeline stage';
        const disableIfNoSelection = selectedStage ? {} : {disabled: 'disabled'}; // TODO: Delete if we don't use this any more

        let detailsOrPlaceholder;

        if (steps && steps.length) {
            detailsOrPlaceholder = (
                <div className="editor-main-stage-details">
                    <div className="editor-main-step-list">
                        {selectedStage ? <EditorStepList steps={steps}
                                                         selectedStep={selectedStep}
                                                         onAddStepClick={() => this.openSelectStepDialog()}
                                                         onAddChildStepClick={parent => this.openSelectStepDialog(parent)}
                                                         onStepSelected={(step) => this.selectedStepChanged(step)}
                                                         onDeleteStepClick={(step) => pipelineStore.deleteStep(step)}/>
                            : <p>Select or create a build stage</p>}
                    </div>
                    {selectedStep &&
                    <div className="editor-main-step-details">
                        {selectedStage ? <EditorStepDetails step={selectedStep} key={steps.indexOf(selectedStep)}
                                                            onDataChange={newValue => this.stepDataChanged(newValue)}
                                                            onDeleteStepClick={(step) => pipelineStore.deleteStep(step)}/>
                            : <p>Select or create a build stage</p>}
                    </div>
                    }
                </div>
            );
        } else if (selectedStage) {
            detailsOrPlaceholder = (
                <div className="editor-main-stage-details editor-details-placeholder">
                    <EmptyStateView>
                        <h1>Add a step to <em>{title}</em></h1>

                        <p>
                            Jenkins uses steps within stages to help automate a variety of tasks such as running
                            scripts, checkout out source code and much more.
                        </p>

                        <button onClick={() => this.openSelectStepDialog()}>Add Step</button>
                    </EmptyStateView>
                </div>
            );
        } else {
            detailsOrPlaceholder = (
                <div className="editor-main-stage-details editor-details-placeholder">
                    <EmptyStateView>
                        <h1>{title}</h1>

                        <p>
                            Select a stage on the graph above to reveal steps to be executed in the Pipeline.
                        </p>
                    </EmptyStateView>
                </div>
            );
        }

        let titleBar = selectedStage ? (
            <div className="editor-main-selection-title">
                <h4>{title}</h4>
                <div className="editor-button-bar">
                    <button className="btn-secondary editor-delete-btn"
                        {...disableIfNoSelection}
                            onClick={(e) => this.deleteStageClicked(e)}>
                        Delete stage
                    </button>
                </div>
            </div>
        ) : null;

        return (
            <div className="editor-main">
                <div className="editor-main-graph">
                    {pipelineStore.pipeline &&
                    <EditorPipelineGraph stages={pipelineStore.pipeline.children}
                                         selectedStage={selectedStage}
                                         onStageSelected={(stage) => this.graphSelectedStageChanged(stage)}
                                         onCreateSequentialStage={(name) => this.createSequentialStage(name)}
                                         onCreateParallelStage={(name, parentStage) => this.createParallelStage(name, parentStage)}/>
                    }
                </div>
                {titleBar}
                {detailsOrPlaceholder}
                {this.state.showSelectStep && <AddStepSelectionDialog
                    onClose={() => this.setState({showSelectStep: false})}
                    onStepSelected={(step) => { this.setState({showSelectStep: false}); pipelineStore.addStep(selectedStage, this.state.parentStep, step); }} />}
            </div>
        );
    }
}
