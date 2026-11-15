use crate::base::Size;
use crate::style::node_item::MeasureParams;

pub trait LayoutMeasurer {
    fn measure_layout(&mut self, params: MeasureParams) -> Size;
}