import { Dictionary, groupBy} from 'lodash';
import { Annotation, Entity, Input } from './types/input';
import { ConvertedAnnotation, ConvertedEntity, Output } from './types/output';

export const convertInput = (input: Input): Output => {
  const documents = input.documents.map((document) => {
    // Map all entities to their respective parents if they have a parent
    const entitiesByParent: Dictionary<Entity[]> = groupBy(document.entities, 'refs');

    // Convert entities to converted entities
    const entities: ConvertedEntity[] = document.entities.map((entity: Entity) => convertEntity(entity, entitiesByParent)).sort(sortEntities);

    // Map all annotation to their respective parents if they have a parent for later use
    // Map linked entities to the annotation id for later use
    // Combine everything to a converted annotation
    const annotations = document.annotations.map(convertAnnotation).sort(sortAnnotations);

    // Converted result
    return { id: document.id, entities, annotations };
  });
  return { documents };
};

const convertEntity = (entity: Entity, entitiesByParent: Dictionary<Entity[]>): ConvertedEntity => {
  // Determine children of current entity
  // If current entity does not have any children just return empty array
  // If it does have children return the converted entity
  const currentEntityChildren: Entity[] = entitiesByParent[entity.id];
  const convertedEntityChildren = currentEntityChildren ? [
    ...currentEntityChildren
      .map((currentEntityChild: Entity) => convertEntity(currentEntityChild, entitiesByParent))
  ] : [];

  return {
    id: entity.id,
    name: entity.name,
    type: entity.type,
    class: entity.class,
    children: convertedEntityChildren.sort(sortEntities)
  };
};

// HINT: you probably need to pass extra argument(s) to this function to make it performant.
const convertAnnotation = (annotation: Annotation): ConvertedAnnotation => {
  throw new Error('Not implemented');
};

const sortEntities = (entityA: ConvertedEntity, entityB: ConvertedEntity) => {
  return entityA.name.localeCompare(entityB.name);
};

const sortAnnotations = (annotationA: ConvertedAnnotation, annotationB: ConvertedAnnotation) => {
  return annotationA.index < annotationB.index ? -1 : 1;
};

// BONUS: Create validation function that validates the result of "convertInput". Use yup as library to validate your result.