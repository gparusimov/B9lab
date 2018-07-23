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
import * as OperatorService from '../services/OperatorService';

import { CONFIG } from '../util/config'


class VehicleComponent extends Component {
    constructor (props, context) {
        super(props, context)

        this.handleChange = this.handleChange.bind(this)

        this.state = {
            gas: CONFIG.DEFAULT_GAS_LIMIT,
            vehicle: '',
            balance:'',
            deposit: '',
            requiredDeposit: '',
            operatorAddress: '',
            operatorOwner: '',
            entryBooth: '',
            password : '',
            disabled: true
        }
    }

    async componentWillMount () {
        this.setState({
            ...this.state,

        })
    }

    handleChange (e) {
        this.setState({ ...this.state, [e.target.id]: e.target.value })
    }

    setDisabled () {
        this.setState({
            ...this.state,
            disabled: true
        })
    }

    async selectVehicle (e) {
        const vehicle = e.target.value;

        await this.setState({
            ...this.state,
            vehicle
        });

        const balance = await this.getBalance();

        this.setState({
            ...this.state,
            balance
        })
    }

    async getBalance () {
        let balance;
        try {
            balance = await OperatorService.getBalance(this.state.vehicle);
        } catch (e) {
            balance = 0;
        }
        return balance
    }

    async selectOperator (e) {
        const operatorAddress = e.target.value;
        await this.getAllOperatorInfo(operatorAddress);
        if (operatorAddress && this.state.isPaused){
            await this.runOperator();
        }
    }

    async runOperator() {
        await OperatorService.setPaused(this.state.operatorAddress, false, this.state.operatorOwner, this.state.gas );
        const isPaused = await OperatorService.isOperatorPaused(this.state.operatorAddress);
        this.setState({ ...this.state, isPaused })
    }

    async getAllOperatorInfo (operatorAddress) {
        if (operatorAddress) {
            this.setDisabled();
            const operatorOwner = await OperatorService.getOperatorOwner(operatorAddress);
            const isPaused = await OperatorService.isOperatorPaused(operatorAddress);
            const requiredDeposit = await OperatorService.getOperatorDeposit(operatorAddress);

            await this.setState({
                ...this.state,
                operatorAddress,
                operatorOwner,
                isPaused,
                requiredDeposit,
                disabled: false
            })

        } else this.setState({ ...this.state, operatorAddress })
    }

    async enterRoad() {
        this.setDisabled();
        const multiplier = await OperatorService.isSetMultiplier(this.state.operatorAddress, this.state.vehicle);

        if (!multiplier) {
            alert('Need\'s the multiplier to be set. Operator please set it.')
        }
        else {
            const txEnterRoad = await OperatorService.enterRoad(this.state.operatorAddress, this.state.entryBooth,
                this.state.password, this.state.vehicle, this.state.deposit, this.state.gas);

            if (txEnterRoad && txEnterRoad.logs.length > 0) {
                const exitSecretHashed = txEnterRoad.logs[0].args.exitSecretHashed;
                const entryBooth = txEnterRoad.logs[0].args.entryBooth;
                const newEnterRoadObj = {
                    entryBooth,
                    exitBooth: '',
                    finalFee: '',
                    refundWeis: '',
                    deposit: this.state.deposit,
                    exitSecretHashed,
                    action: 'Enter the road'
                };
                let newState;
                const vehicle = this.state.vehicle;
                const vehicleHistory = this.props.parentState.vehicleHistory[vehicle];

                newState = await {
                    ...this.props.parentState.vehicleHistory,
                    [vehicle]: [...vehicleHistory || [], newEnterRoadObj]
                };
                await this.props.changeParentState('vehicleHistory', newState);
            }

        }

        this.setState({...this.state, disabled: false});

    }

    render () {
        const vehicles = this.props.parentState.vehicles
            .map(vcl => (<option key={vcl.vehicle} value={vcl.vehicle}>{vcl.vehicle}</option>));
        const operators = this.props.parentState.operators
            .map(op => (<option key={op.operator} value={op.operator}>{op.operator}</option>));
        const booths = (this.props.parentState.tollBooths[this.state.operatorAddress] || [])
            .map(bth => (<option key={bth.tollBooth} value={bth.tollBooth}>{bth.tollBooth}</option>));
        return (
            <div>
                <Row className='show-grid'>
                    <Col  md={12}>
                        <Panel bsStyle="primary">
                            <Panel.Heading>
                                <Panel.Title componentClass="h2"><b><center>Vehicle actions </center></b></Panel.Title>
                            </Panel.Heading>
                            <Panel.Body>
                                <Row>
                                    <Col md={4} lg={4}>
                                    </Col>
                                    <Col md={4} lg={4}>
                                        <FormGroup controlId='vehicle' >
                                            <ControlLabel>Select vehicle</ControlLabel>
                                            <FormControl  componentClass='select' placeholder='select' value={this.state.vehicle} onChange={ this.selectVehicle.bind(this) }>
                                                <option value={''}>Select</option>
                                                {vehicles}
                                            </FormControl>
                                        </FormGroup>
                                    </Col>
                                    <Col md={4} lg={4}>
                                    </Col>
                                </Row>

                                <Row className='show-grid'>
                                    <Col md={2} lg={2}>
                                    </Col>

                                    <Col md={8} lg={8}>
                                        <Label bsStyle='primary' >{'Balance: ' + this.state.balance}</Label>
                                        <Label bsStyle='warning'>{this.state.disabled ? 'Please wait' : ''}</Label>
                                    </Col>

                                    <Col md={2} lg={2}>
                                    </Col>

                                </Row>

                                <Row className='show-grid'>

                                    <Col xs={2} md={2} lg={2}>
                                    </Col>

                                    {/* Enter road*/}
                                    <Col xs={12} md={8} lg={8}>
                                        <Panel bsStyle="primary">
                                            <Panel.Heading>
                                                <Panel.Title componentClass="h2"><b>Enter to the entry booth</b></Panel.Title>
                                            </Panel.Heading>
                                            <Panel.Body>
                                                <Grid>
                                                    <Row className='show-grid'>
                                                        <Col md={4} lg={4}>
                                                            <FormGroup controlId='operator' >
                                                                <ControlLabel>Select operator</ControlLabel>
                                                                <FormControl  componentClass='select' placeholder='select' value={this.state.operatorAddress} onChange={ this.selectOperator.bind(this) }>
                                                                    <option value={''}>Select</option>
                                                                    {operators}
                                                                </FormControl>
                                                            </FormGroup>
                                                        </Col>
                                                        <Col xs={8} md={4} lg={4}>
                                                            <FormGroup controlId='entryBooth'>
                                                                <ControlLabel>Select entry booth</ControlLabel>
                                                                <FormControl  componentClass='select' placeholder='select' value={this.state.entryBooth}
                                                                              onChange={ this.handleChange} disabled={this.state.disabled}>
                                                                    <option value={''}>Select</option>
                                                                    {booths}
                                                                </FormControl>
                                                            </FormGroup>
                                                        </Col>
                                                    </Row>
                                                    <Row>
                                                        <Col xs={4} md={2} lg={2}>
                                                            <FormGroup
                                                                controlId='deposit'>
                                                                <ControlLabel>Entry deposit</ControlLabel>
                                                                <FormControl
                                                                    type='number'
                                                                    value={this.state.deposit}
                                                                    disabled={this.state.disabled}
                                                                    placeholder='Input deposit'
                                                                    onChange={this.handleChange}/>
                                                                <Label bsStyle='primary' >{'Operator\'s Deposit: ' + this.state.requiredDeposit}</Label>
                                                            </FormGroup>

                                                        </Col>

                                                        <Col xs={4} md={2} lg={2}>
                                                            <FormGroup
                                                                controlId='password'>
                                                                <ControlLabel>Password</ControlLabel>
                                                                <FormControl
                                                                    type='text'
                                                                    value={this.state.password}
                                                                    disabled={this.state.disabled}
                                                                    placeholder='Input password'
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
                                                            <Button bsStyle="primary" disabled={this.state.disabled}
                                                                    onClick={this.enterRoad.bind(this)}>Start trip</Button>
                                                        </Col>
                                                    </Row>
                                                </Grid>
                                                <p/>
                                                <div>

                                                    <BootstrapTable
                                                        data= {this.props.parentState.vehicleHistory[this.state.vehicle] || []}
                                                        bsFiltersSize="sm"
                                                        search
                                                        headerStyle ={ { background: '#337ab7' }}
                                                        bodyStyle={{ maxHeight: '64vh', overflow: 'overlay' }}>

                                                        <TableHeaderColumn
                                                            ref="action"
                                                            width='12%'
                                                            dataField="action"
                                                            dataSort>
                                                            Action
                                                        </TableHeaderColumn>

                                                        <TableHeaderColumn
                                                            ref="entryBooth"
                                                            width='28%'
                                                            dataField="entryBooth"
                                                            filter={{ type: 'TextFilter', placeholder: 'Filter by address' }}
                                                            dataSort>
                                                            Entry booth address
                                                        </TableHeaderColumn>

                                                        <TableHeaderColumn
                                                            ref="exitBooth"
                                                            width='28%'
                                                            dataField="exitBooth"
                                                            filter={{ type: 'TextFilter', placeholder: 'Filter by address' }}
                                                            dataSort>
                                                            Exit booth address
                                                        </TableHeaderColumn>

                                                        <TableHeaderColumn
                                                            ref="deposit"
                                                            isKey={true}
                                                            width='12%'
                                                            dataField="deposit"
                                                            dataSort>
                                                            Vehicle's deposit
                                                        </TableHeaderColumn>

                                                        <TableHeaderColumn
                                                            ref="finalFee"
                                                            width='10%'
                                                            dataField="finalFee"
                                                            dataSort>
                                                            Final Fee
                                                        </TableHeaderColumn>

                                                        <TableHeaderColumn
                                                            ref="refundWeis"
                                                            width='10%'
                                                            dataField="refundWeis"
                                                            dataSort>
                                                            Refund                                                        </TableHeaderColumn>
                                                    </BootstrapTable>
                                                </div>
                                            </Panel.Body>
                                        </Panel>
                                    </Col>

                                    <Col xs={2} md={2} lg={2}>
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

export default VehicleComponent