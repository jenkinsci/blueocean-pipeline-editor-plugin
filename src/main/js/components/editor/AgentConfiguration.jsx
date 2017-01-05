// @flow

import React, { Component, PropTypes } from 'react';
import pipelineMetadataService from '../../services/PipelineMetadataService';
import type { PipelineInfo, StageInfo } from '../../services/PipelineStore';
import { Dropdown } from '@jenkins-cd/design-language';

type Props = {
    node: PipelineInfo|StageInfo,
    onChange: (agent: Object[]) => any,
};

type State = {
    agents: ?any,
    selectedAgent: Object[],
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

    findOrCreateValue(list: Object[], key: string) {
        for (const arg of list) {
            if (arg.key === key) {
                return arg.value;
            }
        }
        const val = {
            key: key,
            value: {
                isLiteral: true,
                value: '',
            }
        };
        list.push(val);
        return val;
    }

    setAgentKey(key: string, value: string) {
        const { selectedAgent } = this.state;
        const val = this.findOrCreateValue(selectedAgent, key);
        val.value = value;
        this.props.onChange(selectedAgent);
    }

    onAgentChanged(agent) {
        console.log('agent changed', agent);
        const selectedAgent = [
            {
                key: agent.symbol,
                value: { isLiteral: true, value: '' },
            }
        ];
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
            agents: for (const agent of agents) {
                for (const arg of selectedAgent) {
                    if (arg.key === agent.symbol) {
                        selectedAgentMetadata = agent;
                        break agents;
                    }
                }
            }
        }
        
        return (<div className="agent-select">
            <h2>Agent Configuration</h2>
            <Dropdown labelField="symbol" options={agents}
                defaultOption={selectedAgentMetadata}
                onChange={agent => this.onAgentChanged(agent)} />
            {selectedAgent && selectedAgentMetadata && <div className="agent-configuration">
                {selectedAgentMetadata.parameters.map(param => <div className="agent-param">
                    <label>
                        {param.capitalizedName}
                        <input defaultValue={this.findOrCreateValue(selectedAgent, param.name).value}
                            onChange={e => this.setAgentKey(param.name, e.target.value)}/>
                    </label>
                </div>)}
            </div>}
        </div>);
    }
}
