// @flow

import React, { Component, PropTypes } from 'react';
import pipelineMetadataService from '../../services/PipelineMetadataService';
import type { PipelineInfo, StageInfo } from '../../services/PipelineStore';
import idgen from '../../services/IdGenerator';
import { Dropdown } from '@jenkins-cd/design-language';
import { Split } from './Split';
import { TextInput } from '@jenkins-cd/design-language';
import { getAddIconGroup, getDeleteIconGroup } from './common';
import focusOnElement from './focusOnElement';
import InputText from './InputText';

type Props = {
    node: PipelineInfo|StageInfo,
    onChange: (environment: Object[]) => any,
};

type State = {
    isNew: ?boolean,
};

type DefaultProps = typeof EnvironmentConfiguration.defaultProps;

const iconRadius = 10;
function addIcon() {
    return (<svg width={iconRadius*2} height={iconRadius*2}>
        <g transform={`translate(${iconRadius},${iconRadius})`}>
            {getAddIconGroup(iconRadius)}
        </g>
    </svg>);
}

function deleteIcon() {
    return (<svg width={iconRadius*2} height={iconRadius*2}>
        <g transform={`translate(${iconRadius},${iconRadius})`}>
            {getDeleteIconGroup(iconRadius)}
        </g>
    </svg>);
}

function isValidEnvironmentKey(key: string): boolean {
    if (!key) {
        return false;
    }
    if (/^[_$a-zA-Z\xA0-\uFFFF][_$a-zA-Z0-9\xA0-\uFFFF]*$/.test(key)) {
        return true;
    }
    return false;
}

export class EnvironmentConfiguration extends Component<DefaultProps, Props, State> {
    props:Props;
    state:State;

    constructor(props:Props) {
        super(props);
        this.state = { environments: null, selectedEnvironment: props.node && props.node.environment };
    }

    componentWillMount() {
    }

    componentDidMount() {
    }

    addEnvironmentEntry() {
        const { node } = this.props;
        if (!node.environment) {
            node.environment = [];
        }
        // check for empty entries and just focus on them
        const emptyEntry = node.environment.filter(e => !e.key)[0];
        if (!emptyEntry) {
            node.environment.push({
                key: '',
                id: idgen.next(),
                value: {
                    isLiteral: true,
                    value: '',
                }
            });
            this.setState({ isNew: true });
            this.props.onChange();
        }
        focusOnElement('.environment-entry:last-child .split-child:first-child input');
    }

    removeEnviromentEntry(entry, idx) {
        this.props.node.environment.splice(idx,1);
        this.props.onChange();
    }

    render() {
        const { node } = this.props;
        const { isNew } = this.state;

        if (!node) {
            return null;
        }

        return (<div className="environment-select">
            <h5>Environment</h5>
            <Split>
                <span>Name</span>
                <span>Value</span>
                <button onClick={e => this.addEnvironmentEntry()} title="Add"  className="environment-add-delete-icon add">{addIcon()}</button>
            </Split>
            {node.environment && node.environment.map((env, idx) => <div className="environment-entry" key={env.id}>
                <Split>
                    <InputText hasError={!isNew && !isValidEnvironmentKey(env.key)}
                        defaultValue={env.key} onChange={val => { env.key = val; this.setState({ isNew: false }); this.props.onChange(); }}
                        onBlur={e => this.setState({ isNew: false })} />
                    <TextInput defaultValue={env.value.value} onChange={val => { env.value.value = val; this.props.onChange(); }} />
                    <button onClick={e => { this.removeEnviromentEntry(env, idx); this.props.onChange(); }} title="Remove"  className="environment-add-delete-icon delete">{deleteIcon()}</button>
                </Split>
            </div>)}
        </div>);
    }
}
