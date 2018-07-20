import { ActionPayloadInput } from './action-payload-input';
import { UserStorePropertySelect } from '../user-store-property-select';
import { ViewStore } from '../../store';
import * as Components from '../../components';
import * as MobxReact from 'mobx-react';
import * as Model from '../../model';
import * as React from 'react';
import * as Types from '../../types';
import * as uuid from 'uuid';

export interface EventHandlerPropertyViewProps {
	elementProperty: Model.ElementProperty;
}

export interface StoreInjection {
	store: ViewStore;
}

@MobxReact.inject('store')
@MobxReact.observer
export class EventHandlerPropertyView extends React.Component<EventHandlerPropertyViewProps> {
	private handleActionChange(
		item: Components.SimpleSelectOption | Components.SimpleSelectOption[]
	): void {
		const selected = Array.isArray(item) ? item[0] : item;
		const props = this.props as EventHandlerPropertyViewProps & StoreInjection;
		const project = props.store.getProject();
		const userStore = project.getUserStore();
		const selectedAction = userStore.getActionById(selected.value);

		if (!selectedAction || selectedAction.getType() === Types.UserStoreActionType.Noop) {
			props.elementProperty.setValue('');
			return;
		}

		const existingElementAction = project
			.getElementActions()
			.find(
				action =>
					action.getElementPropertyId() === props.elementProperty.getId() &&
					selectedAction.getId() === action.getStoreActionId()
			);

		const elementAction =
			existingElementAction ||
			new Model.ElementAction(
				{
					elementPropertyId: props.elementProperty.getId(),
					id: uuid.v4(),
					open: false,
					payload: '',
					payloadType: Types.ElementActionPayloadType.String,
					storeActionId: selectedAction.getId(),
					storePropertyId: selectedAction.getUserStorePropertyId() || ''
				},
				{
					userStore: project.getUserStore()
				}
			);

		project.addElementAction(elementAction);
		props.elementProperty.setValue(elementAction.getId());

		const storePropertyId = elementAction.getStorePropertyId();
		const storeProperty = storePropertyId
			? userStore.getPropertyById(storePropertyId)
			: undefined;

		if (storeProperty && storeProperty.getType() === Types.UserStorePropertyType.Page) {
			const page = props.store.getPages()[0];
			elementAction.setPayload(page ? page.getId() : '');
		}

		props.store.commit();
	}

	private handlePropertyNameChange(
		item: Components.CreateSelectOption,
		action: Components.CreateSelectAction
	): void {
		const props = this.props as EventHandlerPropertyViewProps & StoreInjection;
		const project = props.store.getProject();
		const userStore = project.getUserStore();
		const elementAction = project.getElementActionById(String(props.elementProperty.getValue()));

		if (!elementAction) {
			return;
		}

		switch (action.action) {
			case 'select-option': {
				const storeProperty = userStore.getPropertyById(item.value);

				if (storeProperty) {
					elementAction.setStorePropertyId(storeProperty.getId());
					props.store.commit();
				}

				elementAction.setPayload('');
				elementAction.setPayloadType(Types.ElementActionPayloadType.String);
				break;
			}
			case 'create-option': {
				const newProperty = new Model.UserStoreProperty({
					id: uuid.v4(),
					name: item.value,
					type: Types.UserStorePropertyType.String,
					payload: ''
				});

				userStore.addProperty(newProperty);
				elementAction.setStorePropertyId(newProperty.getId());
				elementAction.setPayload('');
				elementAction.setPayloadType(Types.ElementActionPayloadType.String);
				props.store.commit();
			}
		}
	}

	public render(): JSX.Element | null {
		const props = this.props as EventHandlerPropertyViewProps & StoreInjection;
		const project = props.store.getProject();
		const patternProperty = props.elementProperty.getPatternProperty() as Model.PatternEventHandlerProperty;

		const userStore = project.getUserStore();
		const elementAction = project.getElementActionById(String(props.elementProperty.getValue()));
		const element = props.elementProperty.getElement();

		if (!element) {
			return null;
		}

		const userAction =
			(elementAction && userStore.getActionById(elementAction.getStoreActionId())) ||
			userStore.getNoopAction();

		const userProperty = elementAction
			? userStore.getPropertyById(elementAction.getStorePropertyId() || '')
			: undefined;

		return (
			<div
				key={props.elementProperty.getId()}
				style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap' }}
			>
				<Components.PropertyBox
					headline={patternProperty.getLabel()}
					copy={patternProperty.getDescription()}
				>
					<div
						style={{
							display: 'flex',
							alignItems: 'center',
							flexWrap: 'nowrap',
							marginTop: '12px'
						}}
					>
						<Components.PropertyLabel label={'Action'} />
						<Components.Select
							onChange={e => this.handleActionChange(e)}
							options={userStore
								.getActions()
								.map(a => ({ label: a.getName(), value: a.getId() }))}
							value={{ label: userAction.getName(), value: userAction.getId() }}
						/>
					</div>
					{elementAction &&
						userAction &&
						userAction.getType() === Types.UserStoreActionType.OpenExternal && (
							<div
								style={{
									display: 'flex',
									width: '100%',
									marginTop: '6px',
									alignItems: 'center'
								}}
							>
								<Components.PropertyLabel label="to" />
								<Components.PropertyInput
									type={Components.PropertyInputType.Text}
									value={elementAction.getPayload()}
									placeholder="https://meetalva.io"
									onBlur={() => props.store.commit()}
									onChange={e => elementAction.setPayload(e.target.value)}
								/>
							</div>
						)}
					{elementAction &&
						userAction &&
						userAction.getAcceptsProperty() && (
							<div style={{ width: '100%', marginTop: '6px', marginBottom: '6px' }}>
								<UserStorePropertySelect
									placeholder="Select Variable"
									onChange={(e, meta) => this.handlePropertyNameChange(e, meta)}
									property={userProperty}
								/>
							</div>
						)}
					{elementAction && (
						<ActionPayloadInput elementAction={elementAction} element={element} />
					)}
				</Components.PropertyBox>
			</div>
		);
	}
}
