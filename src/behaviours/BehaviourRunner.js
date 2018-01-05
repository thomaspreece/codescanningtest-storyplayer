// @flow

import BehaviourFactory from '../behaviours/BehaviourFactory';
import BaseRenderer from '../renderers/BaseRenderer';

export default class BehaviourRunner {
    behaviourDefinitions: Object;
    eventCounters: Object;
    baseRenderer: BaseRenderer;
    eventNames: Array<string>;
    behaviours: Array<Object>;

    constructor(behaviourDefinitions: Object, baseRenderer: BaseRenderer) {
        this.behaviourDefinitions = behaviourDefinitions;
        this.eventCounters = {};
        this.behaviours = [];
        this.baseRenderer = baseRenderer;
        this.eventNames = Object.keys(behaviourDefinitions);

        for (let i = 0; i < this.eventNames.length; i += 1) {
            this.eventCounters[this.eventNames[i]] = 0;
        }
    }

    // Run behaviours for a specific event type. Returns true if there's a behaviour, false if none found
    runBehaviours(event: string, completionEvent: string) {
        if (this.behaviourDefinitions[event] === undefined || this.behaviourDefinitions[event] === []) {
            return false;
        }

        // Create all behaviours before starting any behaviours for correct handleOnComplete reference counting
        this.behaviourDefinitions[event].forEach((behaviourDefinition) => {
            const behaviour = BehaviourFactory(
                behaviourDefinition,
                this.handleCompletion.bind(this, event, completionEvent),
            );
            if (behaviour) {
                this.behaviours.push(behaviour);
                this.eventCounters[event] += 1;
            }
        });

        this.behaviours.forEach((behaviour) => { behaviour.start(this.baseRenderer); });
        return true;
    }

    destroyBehaviours() {
        this.behaviours.forEach((behaviour) => { behaviour.destroy(); });
    }

    // Called on behaviour of a specific event type ending
    // Checks for number of behaviours of that type running
    //   - if it's zero, send the completion event
    handleCompletion(event: string, completionEvent: string) {
        if (this.eventCounters[event] === undefined) {
            return;
        }

        if (this.eventCounters[event] > 0) {
            this.eventCounters[event] -= 1;
        }

        if (this.eventCounters[event] === 0) {
            this.baseRenderer.emit(completionEvent);
        }
    }
}