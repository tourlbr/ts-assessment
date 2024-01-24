import { Annotation, Entity, Input } from './types/input';
import { ConvertedAnnotation, ConvertedEntity, Output } from './types/output';

export const convertInput = (input: Input): Output => {
  const documents = input.documents.map((document) => {
    // Map all entities to their respective parents if they have a parent
    const parentEntityChildMap = new Map<string | null, Entity[]>();
    document.entities.forEach((entity: Entity) => {
      if (entity.refs) {
        entity.refs.forEach((refId: string) => {
          const children = parentEntityChildMap.get(refId) || [];

          parentEntityChildMap.set(refId, [...children, entity]);
        })
      }
    });

    // Convert entities to converted entities
    const entities = document.entities.map((entity: Entity) => convertEntity(entity, parentEntityChildMap)).sort(sortEntities);

    // TODO: map the annotations to the new structure and sort them based on the property "index"
    // Make sure the nested children are also mapped and sorted

    // APPROACH
    // TODO: Map all annotation to their respective parents if they have a parent for later use
    // TODO: Map linked entities to the annotation id for later use
    const annotations = document.annotations.map(convertAnnotation).sort(sortAnnotations);
    return { id: document.id, entities, annotations };
  });

  return { documents };
};

const convertEntity = (entity: Entity, parentEntityChildMap: Map<string | null, Entity[]>): ConvertedEntity => {
  // Determine children of current entity
  // If current entity does not have any children just return empty array
  // If it does have children return the converted entity
  const parentEntityChild: Entity[] | undefined = parentEntityChildMap.get(entity.id);
  const children = parentEntityChild ? [
    ...parentEntityChild
      .map((parentEntityChild: any) => convertEntity(parentEntityChild, parentEntityChildMap))
  ] : [];

  return {
    id: entity.id,
    name: entity.name,
    type: entity.type,
    class: entity.class,
    children: children.sort(sortEntities)
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
  throw new Error('Not implemented');
};

// BONUS: Create validation function that validates the result of "convertInput". Use yup as library to validate your result.
