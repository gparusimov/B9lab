import React, { Component } from 'react'
import {BootstrapTable, TableHeaderColumn} from 'react-bootstrap-table';
import {
    Grid,
    Col,
    Row,
    Panel,
    FormGroup,
    Label,
    Button,
    FormControl,
    ControlLabel
} from 'react-bootstrap/lib'
import * as RegulatorService from '../services/RegulatorService'
import { CONFIG } from '../util/config'


class RegulatorComponent extends Component {

    constructor (props, context) {
        super(props, context);

        this.handleChange = this.handleChange.bind(this);

        this.state = {
            gas: CONFIG.DEFAULT_GAS_LIMIT,
            regulator:CONFIG.accounts[0],
            newVehicle: '',
            newVehicleType: '',
            disable: true,
            newOperator: '',
            newDeposit: ''
        }
    }


    handleChange (e) {
        this.setState({ ...this.state, [e.target.id]: e.target.value });
    }

    async componentWillMount () {
        this.setState({
            ...this.state,
            regulator: await RegulatorService.getRegulatorOwner(),
            disable: false
        })
    }

    async createNewOperator() {
        await this.setState({ ...this.state, disable: true });
        let operator, deposit;

        let txNewOperator = await RegulatorService.createNewOperator(this.state.newOperator,
            this.state.newDeposit,
            this.state.regulator,
            this.state.gas);
        if (txNewOperator && txNewOperator.logs.length > 0 ) {
            operator = txNewOperator.logs[1].args.newOperator;
            deposit = txNewOperator.logs[1].args.depositWeis.toNumber();

            const newOperatorObj = {
                operator: operator,
                deposit: deposit
            };
            const newState = await [...this.props.parentState.operators, newOperatorObj];
            await this.props.changeParentState('operators', newState);
        }

        await this.setState({ ...this.state, disable: false});
    }

    async checkUpdateType( vehicles, newVehicle ){
        if (vehicles && vehicles.length) {
            for(let i = 0; i < vehicles.length; i++){
                if (vehicles[i].vehicle === newVehicle.vehicle){
                    vehicles[i].vehicleType = newVehicle.vehicleType;
                    return await vehicles;
                }
            }
            return await false;
        }
        return await false;

    }

    async setNewVehicleType () {
        await this.setState({ ...this.state, disable: true });
        let vehicle, vehicleType;
        let txNewVehicle = await RegulatorService.setVehicleType(this.state.newVehicle,
            this.state.newVehicleType,
            this.state.regulator,
            this.state.gas);
        if (txNewVehicle && txNewVehicle.logs.length > 0 ) {
            vehicle = txNewVehicle.logs[0].args.vehicle;
            vehicleType =txNewVehicle.logs[0].args.vehicleType.toNumber();

            const newVehicleObj = {
                vehicle :vehicle,
                vehicleType:vehicleType
            };
            let newState;
            let vehicles =this.props.parentState.vehicles;
            if (!( newState = await this.checkUpdateType(vehicles,newVehicleObj ))) {
                newState = await [...this.props.parentState.vehicles, newVehicleObj];
            } else {
                console.log('Change vehicle type for '+ newVehicleObj.vehicle +'  to '+ newVehicleObj.vehicleType);
            }
            await this.props.changeParentState('vehicles', newState);
        }
        await this.setState({...this.state, disable: false })
    }

    render () {

        return (
            <div>
                <Row className='show-grid'>
                    <Col  md={12}>
                        <Panel bsStyle="primary">
                            <Panel.Heading>
                                <Panel.Title componentClass="h2"><b> <center>Regulator actions</center> </b></Panel.Title>
                            </Panel.Heading>
                            <Panel.Body>

                                <Row className='show-grid'>

                                    <Col md={6} lg={6}>
                                        <Label bsStyle='primary' >{'Regulator address: ' + this.state.regulator}</Label>
                                        <Label bsStyle='warning'>{this.state.disable ? 'Please wait' : ''}</Label>
                                    </Col>
                                    <Col md={6} lg={6}>
                                        <Label bsStyle='primary' >{'Regulator address: ' + this.state.regulator}</Label>
                                        <Label bsStyle='warning'>{this.state.disable ? 'Please wait' : ''}</Label>
                                    </Col>
                                </Row>

                                <Row className='show-grid'>
                                    <Col xs={12} md={6} lg={6}>
                                        <Panel bsStyle="primary">
                                            <Panel.Heading>
                                                <Panel.Title componentClass="h2"><b>Add vehicle</b></Panel.Title>
                                            </Panel.Heading>
                                            <Panel.Body>
                                                <Grid>
                                                    <Row className='show-grid'>
                                                        <Col xs={8} md={4} lg={4}>
                                                            <FormGroup
                                                                controlId='newVehicle'>
                                                                <ControlLabel>New vehicle's Owner address</ControlLabel>
                                                                <FormControl
                                                                    type='text'
                                                                    value={this.state.newVehicle}
                                                                    placeholder='Enter address'
                                                                    onChange={this.handleChange}/>
                                                            </FormGroup>
                                                        </Col>
                                                    </Row>
                                                    <Row>
                                                        <Col xs={4} md={2} lg={2}>
                                                            <FormGroup
                                                                controlId='newVehicleType'>
                                                                <ControlLabel>New vehicle type</ControlLabel>
                                                                <FormControl
                                                                    type='number'
                                                                    value={this.state.newVehicleType}
                                                                    placeholder='Enter type'
                                                                    onChange={this.handleChange}/>
                                                            </FormGroup>
                                                        </Col>

                                                        <Col xs={4} md={2} lg={2}>
                                                            <FormGroup
                                                                controlId='gas'>
                                                                <ControlLabel>Change the gas limits</ControlLabel>
                                                                <FormControl
                                                                    type='number'
                                                                    value={this.state.gas}
                                                                    placeholder='Enter gas'
                                                                    onChange={this.handleChange}/>
                                                            </FormGroup>
                                                        </Col>

                                                    </Row>
                                                    <Row>
                                                        <Col md={3}>
                                                            <Button bsStyle="primary" disabled={this.state.disable}
                                                                    onClick={this.setNewVehicleType.bind(this)}>Add new vehicle</Button>
                                                        </Col>
                                                    </Row>
                                                </Grid>
                                                <p/>
                                                <div>

                                                    <BootstrapTable
                                                        data={ this.props.parentState.vehicles }
                                                        bsFiltersSize="sm"
                                                        search
                                                        headerStyle ={ { background: '#337ab7' }}
                                                        bodyStyle={{ maxHeight: '64vh', overflow: 'overlay' }}
                                                    >
                                                        <TableHeaderColumn
                                                            ref="vehicle"
                                                            isKey={true}
                                                            width='70%'
                                                            dataField="vehicle"
                                                            filter={{ type: 'TextFilter', placeholder: 'Filter by address' }}
                                                            dataSort>
                                                            Vehicle address
                                                        </TableHeaderColumn>

                                                        <TableHeaderColumn
                                                            ref="vehicle"
                                                            dataField="vehicleType"
                                                            width='30%'
                                                            filter={{ type: 'TextFilter', placeholder: 'Filter by type' }}
                                                            dataAlign="center"
                                                            dataSort>
                                                            Vehicle Type
                                                        </TableHeaderColumn>
                                                    </BootstrapTable>
                                                </div>
                                            </Panel.Body>
                                        </Panel>
                                    </Col>

                                    <Col xs={12} md={6} lg={6}>
                                        <Panel bsStyle="primary">
                                            <Panel.Heading>
                                                <Panel.Title componentClass="h2"><b>Add operator</b></Panel.Title>
                                            </Panel.Heading>
                                            <Panel.Body>
                                                <Grid>
                                                    <Row className='show-grid'>
                                                        <Col xs={8} md={4} lg={4}>
                                                            <FormGroup
                                                                controlId='newOperator'>
                                                                <ControlLabel>New operator</ControlLabel>
                                                                <FormControl
                                                                    type='text'
                                                                    value={this.state.newOperator}
                                                                    placeholder='Enter address'
                                                                    onChange={this.handleChange}/>
                                                            </FormGroup>
                                                        </Col>
                                                    </Row>
                                                    <Row>
                                                        <Col xs={4} md={2} lg={2}>
                                                            <FormGroup
                                                                controlId='newDeposit'>
                                                                <ControlLabel>Deposit</ControlLabel>
                                                                <FormControl
                                                                    type='number'
                                                                    value={this.state.newDeposit}
                                                                    placeholder='Enter deposit'
                                                                    onChange={this.handleChange}/>
                                                            </FormGroup>
                                                        </Col>

                                                        <Col xs={4} md={2} lg={2}>
                                                            <FormGroup
                                                                controlId='gas'>
                                                                <ControlLabel>Change the gas limits</ControlLabel>
                                                                <FormControl
                                                                    type='number'
                                                                    value={this.state.gas}
                                                                    placeholder='Enter gas'
                                                                    onChange={this.handleChange}/>
                                                            </FormGroup>
                                                        </Col>

                                                    </Row>
                                                    <Row>
                                                        <Col md={3}>
                                                            <Button bsStyle="primary" disabled={this.state.disable}
                                                                    onClick={this.createNewOperator.bind(this)}>Create operator</Button>
                                                        </Col>
                                                    </Row>
                                                </Grid>
                                                <p/>
                                                <div>

                                                    <BootstrapTable
                                                        data={ this.props.parentState.operators }
                                                        bsFiltersSize="sm"
                                                        search
                                                        headerStyle ={ { background: '#337ab7' }}
                                                        bodyStyle={{ maxHeight: '64vh', overflow: 'overlay' }}>
                                                        <TableHeaderColumn
                                                            ref="operator"
                                                            width='66%'
                                                            isKey={true}
                                                            dataField="operator"
                                                            filter={{ type: 'TextFilter', placeholder: 'Filter by address' }}
                                                            dataSort>
                                                            Operator address
                                                        </TableHeaderColumn>

                                                        <TableHeaderColumn
                                                            ref="deposit"
                                                            width='16%'
                                                            dataField="deposit"
                                                            filter={{ type: 'TextFilter', placeholder: 'Filter by deposit' }}
                                                            dataAlign="center"
                                                            dataSort>
                                                            Deposit
                                                        </TableHeaderColumn>
                                                    </BootstrapTable>
                                                </div>
                                            </Panel.Body>
                                        </Panel>
                                    </Col>
                                </Row>
                            </Panel.Body>
                        </Panel>
                    </Col>
                </Row>
            </div>
        )
    }
}

export default RegulatorComponent