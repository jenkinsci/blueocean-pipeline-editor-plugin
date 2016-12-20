import { convertJsonToInternalModel }  from '../../../main/js/services/PipelineSyntaxConverter';
import pipelineStepListStore  from '../../../main/js/services/PipelineStepListStore';
import { assert } from 'chai';

describe('Pipeline Syntax Converter', () => {
    before(() => {
        pipelineStepListStore.stepData = JSON.parse(
            require("fs").readFileSync(
                require("path").normalize(__dirname + "/../StepMetadata.json", "utf8")));
    });

    after(() => {
        delete pipelineStepListStore.stepData;
    });
    
    it('converts from JSON: agent any', () => {
        const p = {
            "pipeline": {
                "agent": {
                    "isLiteral": true,
                    "value": "any"
                },
                "stages": []
            }};
        const internal = convertJsonToInternalModel(p);
        assert(internal.agent.value.value == 'any', "Wrong agent");
    });

    it('converts from JSON: agent docker', () => {
        const p = {
            "pipeline": {
                "agent": [  {
                    "key": "docker",
                    "value": {
                        "isLiteral": true,
                        "value": "httpd:2.4.12"
                    }
                }],
                "stages": []
            }};
        const internal = convertJsonToInternalModel(p);
        assert(internal.agent.key == 'docker', "Wrong agent");
    });
    
    it('converts from JSON: single stage', () => {
        const p = {"pipeline": {
            "stages": [  {
                "name": "foo",
                "branches": [{
                    "name": "default",
                    "steps": [{
                        "name": "sh",
                        "arguments": {
                            "isLiteral": true,
                            "value": "echo \"THIS WORKS\""
                        }
                    }]
                }]
            }],
            "agent": {
                "isLiteral": true,
                "value": "any"
            }
        }};
        const internal = convertJsonToInternalModel(p);
        assert(internal.children[0].children.length == 0, "Single stage conversion failed");
        assert(internal.children[0].steps.length == 1, "Steps not at correct stage");
        assert(internal.children[0].name == 'foo', "Wrong stage name");
    });

    it('converts from JSON: parallel stage', () => {
        const p = {"pipeline": {
            "stages": [  {
                "name": "parallel test",
                "branches": [{
                    "name": "branch 1",
                    "steps": [{
                        "name": "echo",
                        "arguments": {
                            "isLiteral": true,
                            "value": "this is branch 1"
                        }
                    }]
                }, {
                    "name": "branch 2",
                    "steps": [{
                        "name": "echo",
                        "arguments": {
                            "isLiteral": true,
                            "value": "this is branch 2"
                        }
                    }]
                }]
            }],
            "agent": {
                "isLiteral": true,
                "value": "any"
            }
        }};

        const internal = convertJsonToInternalModel(p);
        assert(internal.children[0].children.length == 2, "Stages not parallel");
        assert(internal.children[0].steps.length == 0, "Steps not at correct stage");
        assert(internal.children[0].children[0].name == 'branch 1', "Wrong stage name");
        assert(internal.children[0].children[1].name == 'branch 2', "Wrong stage name");
    });
    
    it('converts from JSON: named parameter values properly', () => {
        const p = {"pipeline": {
            "stages": [  {
                "name": "foo",
                "branches": [{
                    "name": "default",
                    "steps": [{
                        "name": "bat",
                        "arguments": [{
                            "key": "script",
                            "value": {
                                "isLiteral": true,
                                "value": "someBatScript"
                            },
                        },{
                            "key": "returnStdout",
                            "value": {
                                "isLiteral": true,
                                "value": true
                            }
                        }]
                    }]
                }]
            }],
            "agent": {
                "isLiteral": true,
                "value": "any"
            }
        }};
        const internal = convertJsonToInternalModel(p);
        const batStep = internal.children[0].steps[0];
        assert(batStep.functionName == 'bat', "Incorrect step function");
        // 'script' is the required parameter
        assert(batStep.data.script == 'someBatScript', "Named arguments not properly handled");
        assert(batStep.data.returnStdout == true, "Named arguments not properly handled");
    });
    
    it('converts from JSON: unnamed parameter values properly', () => {
        const p = {"pipeline": {
            "stages": [  {
                "name": "foo",
                "branches": [{
                    "name": "default",
                    "steps": [{
                        "name": "bat",
                        "arguments": {
                            "isLiteral": true,
                            "value": "someBatScript"
                        }
                    }]
                }]
            }],
            "agent": {
                "isLiteral": true,
                "value": "any"
            }
        }};
        const internal = convertJsonToInternalModel(p);
        const batStep = internal.children[0].steps[0];
        assert(batStep.functionName == 'bat', "Incorrect step function");
        // 'script' is the required parameter
        assert(batStep.data.script == 'someBatScript', "Single required argument not properly handled");
    });

    it('converts from JSON: nested steps', () => {
        const p = {"pipeline": {
            "stages": [{"name": "multiple arguments",
            "branches": [{
                "name": "default","steps": [{
                    "name": "timeout","arguments": [
                        {"key": "time","value": {"isLiteral": true,"value": 5}},
                        {"key": "unit","value": {"isLiteral": true,"value": "SECONDS"}}],
                        "children": [{"name": "echo","arguments": 
                        {"isLiteral": true,"value": "hello"}}]}]}]}],
                        "agent": {"isLiteral": true,"value": "any"}}};
        const internal = convertJsonToInternalModel(p);
        const containerStep = internal.children[0].steps[0];
        assert(containerStep.functionName == 'timeout', "Incorrect step function");
        // 'script' is the required parameter
        assert(containerStep.children.length == 1, "No children for nested step");
    });
});
