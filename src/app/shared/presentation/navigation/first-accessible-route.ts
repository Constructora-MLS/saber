import {
  EffectivePermissions,
  holdsAnyPermission,
} from '../../../iam/domain/model/value-objects/effective-permissions';
import { APPLICATION_CATALOG } from '../components/app-switcher/application-catalog';

/**
 * firstAccessibleRoute is the route that the member may open.
 *
 * The catalog of the applications declares the sections and the permissions
 * that each one needs, so the route is the first section that the platform
 * grants to the member. The answer is null when the member has no access to
 * any application of the platform.
 */
export function firstAccessibleRoute(permissions: EffectivePermissions): string | null {
  for (const application of APPLICATION_CATALOG) {
    if (application.status !== 'active') {
      continue;
    }
    for (const section of application.sections) {
      if (holdsAnyPermission(permissions, section.permissions)) {
        return section.path;
      }
    }
  }

  return null;
}

/**
 * hasAnyAccess reports whether the member may open an application of the
 * platform.
 */
export function hasAnyAccess(permissions: EffectivePermissions): boolean {
  return firstAccessibleRoute(permissions) !== null;
}
