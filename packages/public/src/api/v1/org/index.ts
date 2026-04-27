import org from "./org";
import tasks from "./tasks";
import comments from "./comments";
import labels from "./labels";
import categories from "./categories";
import release from "./release";

/**
 * Public Sayr Organization API — Version 1.
 *
 * @since v1.0.0
 */
const OrgAPI = {
    ...org,
    tasks,
    comments,
    labels,
    categories,
    release
};

export default OrgAPI;