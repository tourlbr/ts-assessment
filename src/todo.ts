import { Dictionary, groupBy, head} from 'lodash';
import { Annotation, Entity, EntityClass, EntityType, Input, TempAnnotation } from './types/input';
import { ConvertedAnnotation, ConvertedEntity, Output } from './types/output';
import { array, mixed, number, object, string } from 'yup';

export const convertInput = (input: Input): Output => {
  const documents = input.documents.map((document) => {
    // Map all entities to their respective parents if they have a parent
    const entitiesByParent: Dictionary<Entity[]> = groupBy(
      document.entities,
      'refs'
    );

    // Convert entities to converted entities
    const entities: ConvertedEntity[] = document.entities
      .map((entity: Entity) => convertEntity(entity, entitiesByParent))
      .sort(sortEntities);


    // Determine annotations by parent id
    const annotationsByParentId: Dictionary<Annotation[]> = groupBy(
      document.annotations,
      'refs'
    );

    // Map all annotation to their respective parents if they have a parent for later use
    // Already set entity light to annotations
    // Filter out annotations that already belong to another annotation as children
    const annotationsByParent: TempAnnotation[] = document.annotations
      .map((annotation: Annotation) =>
        setAnnotationByParent(annotation, entities, annotationsByParentId)
      )
      .filter((annotation: TempAnnotation) => annotation.refs.length === 0);

    // Combine everything to a converted annotation
    const annotations = annotationsByParent
      .map((annotation) => convertAnnotation(annotation))
      .sort(sortAnnotations);

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

const setAnnotationByParent = (
  annotation: Annotation,
  entities: ConvertedEntity[],
  annotationsByParent: Dictionary<Annotation[]>
): TempAnnotation => {
  const currentAnnotationChildren: Annotation[] =
    annotationsByParent[annotation.id] || [];

  const entity = entities.find(
    (entity: ConvertedEntity) => entity.id === annotation.entityId
  );

  return {
    ...annotation,
    children: currentAnnotationChildren.map((c) =>
      setAnnotationByParent(c, entities, annotationsByParent)
    ),
    entity: {
      id: entity ? entity.id : annotation.id,
      name: entity ? entity.name : '',
    },
  };
};

const convertAnnotation = (annotation: TempAnnotation): ConvertedAnnotation => {
  let convertedAnnotationChildren: ConvertedAnnotation[] = [];
  const annotationChildren: TempAnnotation[] = annotation.children || [];

  // If annotation has children
  // - Convert children
  // - Sort children
  if (annotationChildren.length) {
    convertedAnnotationChildren = annotationChildren
      .map((annotation: TempAnnotation) => convertAnnotation(annotation))
      .sort(sortAnnotations);
  }

  return {
    id: annotation.id,
    entity: annotation.entity,
    value: annotation.value,
    index: annotation?.indices?.length
      ? head(annotation.indices)?.start || 0
      : head(convertedAnnotationChildren)?.index || 0,
    children: convertedAnnotationChildren,
  };
};

const sortEntities = (entityA: ConvertedEntity, entityB: ConvertedEntity) => {
  return entityA.name.localeCompare(entityB.name);
};

const sortAnnotations = (annotationA: ConvertedAnnotation, annotationB: ConvertedAnnotation) => {
  return annotationA.index < annotationB.index ? -1 : 1;
};

// BONUS: Create validation function that validates the result of "convertInput". Use yup as library to validate your result.
export const validateConvertInputOutput = async (output: Output) => {
  const entitySchema = object()
    .shape({
      id: string().required(),
      name: string().required(),
      type: mixed().oneOf(Object.values(EntityType)).required(),
      class: mixed().oneOf(Object.values(EntityClass)).required(),
      children: array(object().nullable()),
    })
    .required();

  const annotationSchema = object()
    .shape({
      id: string().required(),
      entity: object({
        id: string().required(),
        name: string().required(),
      }),
      value: mixed()
        .test('value', 'Value must be a number or a string', (value) => {
          if (
            typeof value === 'string' ||
            typeof value === 'number' ||
            (typeof value === 'object' && value === null)
          ) {
            return true;
          }
          return false;
        })
        .nullable(),
      index: number().positive().integer().required(),
    })
    .required();

  const outputSchema = object().shape({
    documents: array(
      object({
        id: string().required(),
        entities: array(entitySchema).required(),
        annotations: array(annotationSchema).required(),
      })
    ).required(),
  });

  return await outputSchema.validate(output);
};