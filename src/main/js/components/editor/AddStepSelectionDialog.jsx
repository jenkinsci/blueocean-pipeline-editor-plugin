// @flow

import React, { Component, PropTypes } from 'react';
import pipelineStepListStore from '../../services/PipelineStepListStore';
import { Dialog } from '@jenkins-cd/design-language';
import { Icon } from "react-material-icons-blue";
import debounce from 'lodash.debounce';

const isStepValidForSelectionUI = (step) => {
    switch (step.type) {
        case 'org.jenkinsci.plugins.workflow.support.steps.StageStep':
        case 'org.jenkinsci.plugins.docker.workflow.WithContainerStep':
            return false;
    }
    return true;
};

type Props = {
    onClose?: () => any,
    onStepSelected: (step:StepInfo) => any,
}

type State = {
    selectedStep?: () => any,
    steps: Array<any>,
    searchFilter: Function,
};

type DefaultProps = typeof AddStepSelectionDialog.defaultProps;

export class AddStepSelectionDialog extends Component<DefaultProps, Props, State> {
    props:Props;
    state:State;

    constructor(props:Props) {
        super(props);
        this.state = { steps: null, selectedStep: null, searchFilter: e => true };
    }

    componentWillMount() {
        pipelineStepListStore.getStepListing(data => {
            this.setState({steps: data});
        });
    }

    componentDidMount() {
        this.refs.searchInput.focus();
    }

    closeDialog() {
        this.props.onClose();
    }

    selectAddStep() {
        this.props.onStepSelected(this.state.selectedStep);
        this.closeDialog();
    }

    filterSteps = debounce((value) => {
        const searchTerm = value.toLowerCase();
        this.setState({searchFilter: s => s.displayName.toLowerCase().indexOf(searchTerm) !== -1});
    }, 300);
    
    selectItemByKeyPress(e, step) {
        if (e.key == 'Enter') {
            this.props.onStepSelected(step);
            this.closeDialog();
        }
        else if (e.key == ' ') {
            this.setState({selectedStep: step});
        }
    }

    render() {
        const { steps, selectedStep } = this.state;
        
        const buttons = [
            <button className="btn-secondary" onClick={() => this.closeDialog()}>Cancel</button>,
            <button disabled={!this.state.selectedStep} onClick={() => this.selectAddStep()}>Use step</button>,
        ];
        
        return (
            <Dialog onDismiss={() => this.closeDialog()} title="Add Step" buttons={buttons}>
                <div className="editor-step-selection-dialog">
                    <div className="editor-step-selection-dialog-search">
                        <Icon icon="search" style={{ fill: '#ddd' }} size={32} />
                        <input ref="searchInput" type="text" className="editor-step-selection-dialog-search-input" onChange={e => this.filterSteps(e.target.value)}
                            placeholder="Find steps by name" />
                    </div>
                    <div className="editor-step-selection-dialog-steps">
                    {steps && steps.filter(isStepValidForSelectionUI).filter(this.state.searchFilter).map(step =>
                        <div tabIndex="0" onKeyPress={e => this.selectItemByKeyPress(e, step)} onClick={() => this.setState({selectedStep: step})} onDoubleClick={() => this.selectAddStep()} className={'step-item' + (this.state.selectedStep === step ? ' selected' : '')}>
                            {step.displayName}
                        </div>
                    )}
                    </div>
                </div>
            </Dialog>
        );
    }
}
