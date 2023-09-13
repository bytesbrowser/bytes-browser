extern crate proc_macro;

use proc_macro::TokenStream;
use quote::{format_ident, quote};
use syn::{parse_macro_input, ItemFn};

#[proc_macro_attribute]
pub fn enforce_single_instance(_attrs: TokenStream, input: TokenStream) -> TokenStream {
    // Parse the input tokens into a syntax tree
    let mut input = parse_macro_input!(input as ItemFn);

    // Extract the function name and generate a unique mutex name based on the function name
    let fn_name = input.sig.ident.clone();
    let mutex_name = format_ident!("{}_MUTEX", fn_name);
    let original_fn_name = format_ident!("{}_original", fn_name);

    // Rename the original function
    input.sig.ident = original_fn_name.clone();

    // Extract attributes, visibility, signature, and block from the input
    let attrs = &input.attrs;
    let vis = &input.vis;
    let sig = &input.sig;
    let block = &input.block;

    // Generate the new function with a Mutex check
    let expanded = quote! {
        #(#attrs)*
        #vis fn #sig #block

        lazy_static! {
            static ref #mutex_name: std::sync::Mutex<Option<()>> = std::sync::Mutex::new(None);
        }

        #vis fn #fn_name() {
            let mut lock = #mutex_name.lock().unwrap();
            if lock.is_none() {
                *lock = Some(());
                #original_fn_name();
                *lock = None;
            }
        }
    };

    // Return the generated token stream
    TokenStream::from(expanded)
}
