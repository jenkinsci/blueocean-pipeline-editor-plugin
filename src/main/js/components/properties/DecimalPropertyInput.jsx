import React from 'react';

export default class DecimalPropertyInput extends React.Component {
    render() {
        return (
            <div>
                <label className="form-label">{this.props.type.capitalizedName + (this.props.type.isRequired ? '*' : '')}</label>
                <div className="TextInput">
                    <input type="number" className="TextInput-control" defaultValue={this.props.step.data[this.props.propName]}
                        onChange={e => { this.props.step.data[this.props.propName] = parseFloat(e.target.value); this.props.onChange(this.props.step); }}/>
                </div>
            </div>
        );
    }
}

DecimalPropertyInput.propTypes = {
    propName: React.PropTypes.string,
    step: React.PropTypes.any,
    onChange: React.PropTypes.func,
};

DecimalPropertyInput.dataTypes = [ 'float', 'double', 'java.lang.Float', 'java.lang.Double', 'java.math.BigDecimal' ];
