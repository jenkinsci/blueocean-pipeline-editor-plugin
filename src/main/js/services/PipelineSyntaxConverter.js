// @flow

import { Fetch, UrlConfig } from '@jenkins-cd/blueocean-core-js';
import type { PipelineInfo, StageInfo, StepInfo } from './PipelineStore';
import pipelineStepListStore from './PipelineStepListStore';

const value = 'value';

export type PipelineJsonContainer = {
    pipeline: PipelineJson,
};

export type PipelineJson = {
    stages: PipelineStage[],
    agent: PipelineValueDescriptor,
};

export type PipelineValueDescriptor = {
    isLiteral: boolean,
    value: string,
};

export type PipelineNamedValueDescriptor = {
    key: string,
    value: PipelineValueDescriptor,
};

export type PipelineStep = {
    name: string,
    children: PipelineStep[],
    arguments: PipelineValueDescriptor | PipelineNamedValueDescriptor[],
};

export type PipelineStage = {
    name: string,
    branches: PipelineStage[],
    agent: PipelineValueDescriptor,
    steps: PipelineStep[],
};

function singleValue(v: any) {
    if (Array.isArray(v)) {
        return v[0];
    }
    return {
        value: v,
    };
}

export function convertJsonToInternalModel(json: PipelineJsonContainer): PipelineInfo {
    let idgen = { id: 0, next() { return --this.id; } };
    const pipeline = json.pipeline;
    const out: PipelineInfo = {
        id: idgen.next(),
        children: [],
        steps: [],
    };

    if (!pipeline.agent) {
        // we default agent to 'any'
        out.agent = {
            value: {
                value: 'any',
            },
        };
    } else {
        out.agent = singleValue(pipeline.agent);
    }

    if (!pipeline.stages) {
        throw new Error('Pipeline must define stages');
    }

    for (let i = 0; i < pipeline.stages.length; i++) {
        const topStage = pipeline.stages[i];

        const topStageInfo: StageInfo = {
            id: idgen.next(),
            name: topStage.name,
            children: [],
            steps: [],
        };

        out.children.push(topStageInfo);

        for (let j = 0; j < topStage.branches.length; j++) {
            const b = topStage.branches[j];

            let stage: StageInfo;
            if (b.name == 'default' && topStage.branches.length === 1) {
                // non-parallel top-level stages are defined by a single
                // nested stage named 'default'
                stage = topStageInfo;
            } else {
                // Otherwise this is part of a parallel set
                stage = {
                    id: idgen.next(),
                    name: b.name,
                    children: [],
                    steps: [],
                };
                topStageInfo.children.push(stage);
            }

            for (let stepIndex = 0; stepIndex < b.steps.length; stepIndex++) {
                const s = b.steps[stepIndex];
                const step = readStep(s, idgen);
                stage.steps.push(step);
            }
        }
    }

    return out;
}

function readStep(s: PipelineStep, idgen: any) {
    // this will already have been called and cached:
    let stepMeta = [];
    pipelineStepListStore.getStepListing(steps => {
        stepMeta = steps;
    });
    const meta = stepMeta.filter(md => md.functionName === s.name)[0];
    const step = {
        name: s.name,
        label: meta.displayName,
        functionName: meta.functionName,
        data: {},
        isContainer: meta.isBlockContainer,
        children: [],
        id: idgen.next(),
    };
    if (s.arguments) {
        const args = s.arguments instanceof Array ? s.arguments : [ s.arguments ];
        for (let k = 0; k < args.length; k++) {
            const arg = args[k];
            if (arg.key) {
                step.data[arg.key] = arg.value.value;
            } else {
                if (!meta.parameters) {
                    throw new Error('No parameters for: ' + s.name);
                }
                // this must be a requiredSingleParameter,
                // need to find it to set the right parameter value
                const param = meta.parameters.filter(a => a.isRequired)[0];
                if (!param) {
                    throw new Error('Unable to find required parameter for: ' + s.name);
                }
                step.data[param.name] = arg.value;
            }
        }
    }
    if (s.children && s.children.length > 0) {
        for (const c of s.children) {
            const child = readStep(c, idgen);
            step.children.push(child);
        }
    }
    return step;
}

export function convertInternalModelToJson(model: StageInfo): PipelineJsonContainer {
}

function fetch(url, body, handler) {
    Fetch.fetch(`${UrlConfig.getJenkinsRootURL()}/blue/rest/pipeline-metadata/crumbInfo`, {
        fetchOptions: { method: 'GET' }
    }).then(response => {
        if (!response.ok) {
            console.log('An error happened fetching ', url);
            return;
        }
        const useCrumb = function (crumb) {
            crumb = crumb.split('=');
            const headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            };
            headers[crumb[0]] = crumb[1];
            Fetch.fetchJSON(url, {
                fetchOptions: {
                    method: 'POST',
                    body: body,
                    headers: headers,
                }
            }).then(data => {
                if (data.status === 'ok') {
                    handler(data.data);
                } else {
                    console.log(data);
                }
            });
        };
        let crumb = response.text();
        if (crumb instanceof Promise) {
            crumb.then(useCrumb);
        } else {
            useCrumb(crumb);
        }
    });
}

export function convertPipelineToJson(pipeline: string, handler) {
    pipelineStepListStore.getStepListing(steps => {
        fetch(`${UrlConfig.getJenkinsRootURL()}/pipeline-model-converter/toJson`,
            'jenkinsfile=' + encodeURIComponent(pipeline), data => handler(data.json));
    });
}

export function convertJsonToPipeline(json: string, handler) {
    pipelineStepListStore.getStepListing(steps => {
        fetch(`${UrlConfig.getJenkinsRootURL()}/pipeline-model-converter/toJenkinsfile`,
            'json=' + encodeURIComponent(json), data => handler(data.jenkinsfile));
    });
}
