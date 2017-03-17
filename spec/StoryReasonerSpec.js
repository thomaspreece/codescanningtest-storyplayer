// @flow

import chai, { expect } from 'chai';
import sinon from 'sinon';
import sinonChai from 'sinon-chai';

chai.use(sinonChai);

import StoryReasoner from '../src/StoryReasoner';

describe('StoryReasoner', () => {

    const PRESENTATION_OBJECT_ID = '8d7e96f2-fbc0-467c-a285-88a8908bc954';
    let story;
    let storyFetcher;
    let storyReasoner;

    beforeEach(() => {
        story = {
            id: "23fb988d-510f-48c2-bae5-9b9e7d927bf4",
            version: "0:0",
            name: "A sample story",
            tags: {},
            beginnings: [],
            narrative_objects: [],
        };
        storyFetcher = sinon.stub();
    });

    function buildStoryReasoner() {
        storyReasoner = new StoryReasoner(story, storyFetcher);
    }

    it('emits the first narrative element on story start', (done) => {
        let narrativeObjectId = "c46cd043-9edc-4c46-8b7c-f70afc6d6c23";
        let name = 'My narrative object';
        addNarrativeObject(narrativeObjectId, name, true, []);
        buildStoryReasoner();

        storyReasoner.on('narrativeElementChanged', narrativeElement => {
            expect(narrativeElement.id).to.equal(narrativeObjectId);
            expect(narrativeElement.name).to.equal(name);
            done();
        });

        storyReasoner.start();
    });

    it('only passes the first logic rule which satisfies the condition as the start', (done) => {
        const expectedId = "c46cd043-9edc-4c46-8b7c-f70afc6d6c23";
        const expectedName = "My narrative object";

        addNarrativeObject("3d4b829e-390e-45cb-a314-eeed0d66064f", "My bad narrative object", false, []);
        addNarrativeObject(expectedId, expectedName, true, []);
        buildStoryReasoner();

        storyReasoner.on('narrativeElementChanged', narrativeElement => {
            expect(narrativeElement.id).to.equal(expectedId);
            expect(narrativeElement.name).to.equal(expectedName);
            done();
        });

        storyReasoner.start();
    });

    it('generates an error if there are no possible moves left', (done) => {
        buildStoryReasoner();

        storyReasoner.on('error', () => {
            done();
        });

        storyReasoner.start();
    });

    it('uses JSONLogic to evaluate the beginning rules', (done) => {
        const expectedId = "c46cd043-9edc-4c46-8b7c-f70afc6d6c23";
        const expectedName = "My narrative object";

        addNarrativeObject("3d4b829e-390e-45cb-a314-eeed0d66064f", "My bad narrative object", {'==': [0, 1]}, []);
        addNarrativeObject(expectedId, expectedName, {'==': [1, 1]}, []);
        buildStoryReasoner();

        storyReasoner.on('narrativeElementChanged', narrativeElement => {
            expect(narrativeElement.id).to.equal('c46cd043-9edc-4c46-8b7c-f70afc6d6c23');
            expect(narrativeElement.name).to.equal("My narrative object");
            done();
        });

        storyReasoner.start();
    });

    it('emits an error on the next event if there are no suitable links', (done) => {
        addNarrativeObject("3d4b829e-390e-45cb-a314-eeed0d66064f", "My start narrative object", true, []);
        buildStoryReasoner();
        storyReasoner.start();

        storyReasoner.on('error', () => {
            done();
        });

        storyReasoner.next();
    });

    it('emits the next item when prodded', (done) => {
        addNarrativeObject("3d4b829e-390e-45cb-a314-eeed0d66064f", "My start narrative object", true, [
            {
                link_type: 'NARRATIVE_OBJECT',
                target: '7772a753-7ea8-4375-921f-6b086535e1c8',
                condition: true,
            },
        ]);
        addNarrativeObject("7772a753-7ea8-4375-921f-6b086535e1c8", "My second narrative object", null, []);

        buildStoryReasoner();
        storyReasoner.start();

        storyReasoner.on('narrativeElementChanged', narrativeElement => {
            expect(narrativeElement.id).to.equal('7772a753-7ea8-4375-921f-6b086535e1c8');
            done();
        });

        storyReasoner.next();
    });

    it('handles fuzzy logic appropriately', (done) => {
        const expectedId = "c46cd043-9edc-4c46-8b7c-f70afc6d6c23";
        const expectedName = "My narrative object";
        addNarrativeObject("3d4b829e-390e-45cb-a314-eeed0d66064f", "My bad narrative object", {'-': [1.0, 0.5]}, []);
        addNarrativeObject(expectedId, expectedName, {'-': [1.0, 0.1]}, []);
        buildStoryReasoner();

        storyReasoner.on('narrativeElementChanged', narrativeElement => {
            expect(narrativeElement.id).to.equal('c46cd043-9edc-4c46-8b7c-f70afc6d6c23');
            expect(narrativeElement.name).to.equal("My narrative object");
            done();
        });

        storyReasoner.start();
    });

    it('never selects false links', (done) => {
        addNarrativeObject("3d4b829e-390e-45cb-a314-eeed0d66064f", "My bad narrative object", false, []);
        buildStoryReasoner();

        storyReasoner.on('error', () => {
            done();
        });

        storyReasoner.start();
    });

    it('gives boolean true priority above any fuzzy logic', (done) => {
        const expectedId = "c46cd043-9edc-4c46-8b7c-f70afc6d6c23";
        const expectedName = "My narrative object";
        addNarrativeObject("3d4b829e-390e-45cb-a314-eeed0d66064f", "My bad narrative object", {'+': [1.0, 0.5]}, []);
        addNarrativeObject(expectedId, expectedName, true, []);
        buildStoryReasoner();

        storyReasoner.on('narrativeElementChanged', narrativeElement => {
            expect(narrativeElement.id).to.equal('c46cd043-9edc-4c46-8b7c-f70afc6d6c23');
            done();
        });

        storyReasoner.start();
    });

    it('gives higher priority to items which come first', (done) => {
        const expectedId = "3d4b829e-390e-45cb-a314-eeed0d66064f";
        const expectedName = "My narrative object";
        addNarrativeObject(expectedId, expectedName, {'+': [1.0, 0.5]}, []);
        addNarrativeObject("c46cd043-9edc-4c46-8b7c-f70afc6d6c23", "My bad narrative object", {'+': [1.0, 0.5]}, []);
        buildStoryReasoner();

        storyReasoner.on('narrativeElementChanged', narrativeElement => {
            expect(narrativeElement.id).to.equal('3d4b829e-390e-45cb-a314-eeed0d66064f');
            done();
        });

        storyReasoner.start();
    });

    it('sends an endStory event when the story ends', (done) => {
        addNarrativeObject("c46cd043-9edc-4c46-8b7c-f70afc6d6c23", "My narrative object", true, [
            {
                link_type: 'END_STORY',
                condition: true,
            },
        ]);
        buildStoryReasoner();
        storyReasoner.start();

        storyReasoner.on('storyEnd', () => {
            done();
        });

        storyReasoner.next();
    });

    it('does not allow you to trigger next when a story has ended', () => {
        addNarrativeObject("c46cd043-9edc-4c46-8b7c-f70afc6d6c23", "My narrative object", true, [
            {
                link_type: 'END_STORY',
                condition: true,
            },
        ]);
        buildStoryReasoner();
        storyReasoner.start();
        storyReasoner.next();

        expect(() => storyReasoner.next()).to.throw(Error);
    });

    it('does not allow you to trigger next before a story has started', () => {
        buildStoryReasoner();

        expect(() => storyReasoner.next()).to.throw(Error);
    });

    it('does not allow you to trigger start a story twice', () => {
        addNarrativeObject("c46cd043-9edc-4c46-8b7c-f70afc6d6c23", "My narrative object", true, []);
        buildStoryReasoner();

        storyReasoner.start();
        expect(() => storyReasoner.start()).to.throw(Error);
    });

    it('will allow you to go back to the beginning of the story', (done) => {
        addNarrativeObject("3d4b829e-390e-45cb-a314-eeed0d66064f", "My start narrative object", true, [
            {
                link_type: 'CHOOSE_BEGINNING',
                condition: true,
            },
        ]);
        buildStoryReasoner();
        storyReasoner.start();

        storyReasoner.on('narrativeElementChanged', narrativeElement => {
            expect(narrativeElement.id).to.equal('3d4b829e-390e-45cb-a314-eeed0d66064f');
            done();
        });

        storyReasoner.next();
    });

    it('generates an error if the link type is unrecognised', (done) => {
        addNarrativeObject("3d4b829e-390e-45cb-a314-eeed0d66064f", "My start narrative object", true, [
            {
                link_type: 'WOBBLE',
                condition: true,
            },
        ]);
        buildStoryReasoner();
        storyReasoner.start();

        storyReasoner.on('error', () => {
            done();
        });

        storyReasoner.next();
    });

    it('will fetch a sub-story if the presentation of a narrative node is another story', () => {
        addNarrativeObject("3d4b829e-390e-45cb-a314-eeed0d66064f", "My start narrative object", true, [], true);
        buildStoryReasoner();
        storyReasoner.start();

        expect(storyFetcher).to.have.been.calledWith(PRESENTATION_OBJECT_ID);
    });

    function addNarrativeObject(id, name, condition, links, referencesSubStory) {
        if (condition !== null) {
            story.beginnings.push({id, condition});
        }
        const presentation = {
            type: referencesSubStory ? 'STORY_OBJECT' : 'PRESENTATION_OBJECT',
            target: PRESENTATION_OBJECT_ID,
        };
        story.narrative_objects.push({ id, name, links, presentation });
    }

});
