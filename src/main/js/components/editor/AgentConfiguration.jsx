// @flow

import React, { Component, PropTypes } from 'react';
import type { PipelineAgent } from '../../services/PipelineSyntaxConverter';
import pipelineMetadataService from '../../services/PipelineMetadataService';
import type { PipelineInfo, StageInfo } from '../../services/PipelineStore';
import { Dropdown } from '@jenkins-cd/design-language';
import { Split } from './Split';

type Props = {
    node: PipelineInfo|StageInfo,
    onChange: (agent: PipelineAgent) => any,
};

type State = {
    agents: ?any,
    selectedAgent: PipelineAgent,
};

type DefaultProps = typeof AgentConfiguration.defaultProps;

export class AgentConfiguration extends Component<DefaultProps, Props, State> {
    props:Props;
    state:State;

    constructor(props:Props) {
        super(props);
        this.state = { agents: null, selectedAgent: props.node.agent };
    }

    componentWillMount() {
        pipelineMetadataService.getAgentListing(data => {
            this.setState({agents: data});
        });
    }

    componentDidMount() {
    }

    componentWillReceiveProps(nextProps: Props) {
        this.setState({selectedAgent: nextProps.node.agent});
    }

    getRealOrEmptyArg(key: string) {
        const { selectedAgent } = this.state;
        if (selectedAgent.arguments) {
            for (const arg of selectedAgent.arguments) {
                if (arg.key === key) {
                    return arg;
                }
            }
        }
        return {
            key: key,
            value: {
                isLiteral: true,
                value: '',
            }
        };
        return val;
    }

    setAgentValue(key: string, value: string) {
        const { selectedAgent } = this.state;
        const val = this.getRealOrEmptyArg(key);
        const idx = selectedAgent.arguments.indexOf(val);

        // remove any existing values
        if (idx !== -1) {
            selectedAgent.arguments.splice(idx, 1);
        }
        // add the value if not empty
        if (value) {
            selectedAgent.arguments.push({
                key: key,
                value: {
                    isLiteral: true,
                    value: value,
                },
            });
        }
        this.props.onChange(selectedAgent);
    }

    onAgentChanged(agent: any) {
        console.log('agent changed', agent);
        const selectedAgent = {
            type: agent.symbol, // agent is metadata
            arguments: [],
        };
        this.setState({selectedAgent: selectedAgent});
        this.props.onChange(selectedAgent);
    }

    render() {
        const { node } = this.props;
        const { agents, selectedAgent } = this.state;

        if (!agents) {
            return null;
        }

        // find the parameter matching the symbol to determine which agent is selected
        let selectedAgentMetadata;
        if (selectedAgent) {
            for (const agent of agents) {
                if (selectedAgent.type === agent.symbol) {
                    selectedAgentMetadata = agent;
                    break;
                }
            }
        }
        
        return (<div className="agent-select">
            <h4>Agent Configuration</h4>
            <Dropdown labelField="symbol" options={agents}
                defaultOption={selectedAgentMetadata}
                onChange={agent => this.onAgentChanged(agent)} />
            <Split>
            {selectedAgent && selectedAgentMetadata && <div className="agent-configuration">
                {selectedAgentMetadata.parameters.map(param => <div className="agent-param">
                    <label key={selectedAgent.type + '/' + param.name}>
                        <div>{param.capitalizedName}</div>
                        <div>
                            <input defaultValue={this.getRealOrEmptyArg(param.name).value.value}
                                onChange={e => this.setAgentValue(param.name, e.target.value)}/>
                        </div>
                    </label>
                </div>)}
            </div>}
            </Split>
        </div>);
    }
}
